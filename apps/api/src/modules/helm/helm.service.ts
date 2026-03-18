import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as zlib from "zlib";
import { promisify } from "util";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import {
  Deployment,
  DeploymentStatus,
} from "../environments/entities/deployment.entity";
import { Component } from "../catalog/entities/component.entity";
import { Environment } from "../environments/entities/environment.entity";
import { HelmRelease } from "./helm-release.interface";

const gunzip = promisify(zlib.gunzip);

/**
 * Raw shape of the Helm release JSON stored inside each Secret's data.release.
 * Only fields consumed by this service are listed; all others are opaque.
 */
interface HelmReleaseJson {
  name?: string;
  namespace?: string;
  version?: number;
  info?: {
    status?: string;
    last_deployed?: string;
  };
  chart?: {
    metadata?: {
      name?: string;
      version?: string;
      appVersion?: string;
    };
  };
}

/**
 * Service that discovers Helm releases stored as Kubernetes Secrets and
 * optionally syncs them as Deployment records in the Farm database.
 *
 * Helm 3 encodes each release as:
 *   Secret.type  = "helm.sh/release.v1"
 *   Secret.labels.owner = "helm"
 *   Secret.data.release = base64( gzip( JSON.stringify(releaseObject) ) )
 */
@Injectable()
export class HelmService {
  private readonly logger = new Logger(HelmService.name);

  constructor(
    private readonly kubernetesService: KubernetesService,
    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
  ) {}

  /**
   * Lists all Helm releases in the cluster by reading Secrets labelled
   * "owner=helm" from the specified namespace (or all namespaces).
   *
   * @param namespace - Kubernetes namespace to query; omit for all namespaces
   * @returns Array of parsed HelmRelease objects
   */
  async listReleases(namespace?: string): Promise<HelmRelease[]> {
    if (!this.kubernetesService.isEnabled()) {
      this.logger.warn(
        "Kubernetes is not enabled; returning empty release list",
      );
      return [];
    }

    const coreV1Api = this.kubernetesService.getCoreV1Api();
    if (!coreV1Api) {
      this.logger.warn("CoreV1Api not available; returning empty release list");
      return [];
    }

    try {
      const labelSelector = "owner=helm";

      const response = namespace
        ? await coreV1Api.listNamespacedSecret({ namespace, labelSelector })
        : await coreV1Api.listSecretForAllNamespaces({ labelSelector });

      const secrets = response.items ?? [];
      const releases: HelmRelease[] = [];

      for (const secret of secrets) {
        if (secret.type !== "helm.sh/release.v1") {
          continue;
        }

        const releaseData = secret.data?.["release"];
        if (!releaseData) {
          continue;
        }

        try {
          const decoded = await this.decodeHelmRelease(releaseData);
          if (decoded) {
            releases.push(decoded);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to decode release secret "${secret.metadata?.name}": ${msg}`,
          );
        }
      }

      return releases;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list Helm releases: ${message}`);
      return [];
    }
  }

  /**
   * Decodes a Helm 3 release blob from base64-encoded gzip-compressed JSON.
   * Helm 3 double-base64-encodes the payload: base64( base64( gzip( JSON ) ) ).
   *
   * @param encodedData - base64 string from Secret.data.release
   * @returns Parsed HelmRelease or null if decoding fails
   */
  async decodeHelmRelease(encodedData: string): Promise<HelmRelease | null> {
    const firstDecode = Buffer.from(encodedData, "base64");

    let jsonBuffer: Buffer;
    try {
      // Attempt double-decode (Helm 3 standard encoding).
      const secondDecode = Buffer.from(firstDecode.toString("utf8"), "base64");
      jsonBuffer = await gunzip(secondDecode);
    } catch {
      // Fallback to single-decode.
      try {
        jsonBuffer = await gunzip(firstDecode);
      } catch (fallbackErr) {
        const msg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : String(fallbackErr);
        throw new Error(`gunzip failed: ${msg}`);
      }
    }

    const raw = JSON.parse(jsonBuffer.toString("utf8")) as HelmReleaseJson;

    return {
      name: raw.name ?? "unknown",
      namespace: raw.namespace ?? "default",
      chart: raw.chart?.metadata?.name ?? "unknown",
      chartVersion: raw.chart?.metadata?.version ?? "unknown",
      appVersion: raw.chart?.metadata?.appVersion ?? "unknown",
      status: raw.info?.status ?? "unknown",
      revision: raw.version ?? 0,
      updatedAt: raw.info?.last_deployed ?? new Date().toISOString(),
    };
  }

  /**
   * Syncs discovered Helm releases as Deployment records in the Farm database.
   *
   * For each release the service attempts to:
   *   1. Resolve the matching Component by release name.
   *   2. Resolve the matching Environment by namespace name.
   *   3. Find an existing Deployment whose metadata.helmReleaseName matches.
   *   4. If none found and both component/environment exist, create a new one.
   *
   * Errors per release are collected and returned rather than thrown so that
   * a single failure does not abort the entire sync.
   *
   * @param namespace - Kubernetes namespace to query; omit for all namespaces
   * @returns Count of synced records and per-release error messages
   */
  async syncReleases(
    namespace?: string,
  ): Promise<{ synced: number; errors: string[] }> {
    if (!this.kubernetesService.isEnabled()) {
      this.logger.warn("Kubernetes is not enabled; skipping release sync");
      return { synced: 0, errors: [] };
    }

    const releases = await this.listReleases(namespace);
    const errors: string[] = [];
    let synced = 0;

    for (const release of releases) {
      try {
        await this.upsertReleaseDeployment(release);
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const label = `${release.namespace}/${release.name}`;
        this.logger.error(`Failed to sync release "${label}": ${msg}`);
        errors.push(`${label}: ${msg}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Creates or updates a Deployment record for a single Helm release.
   * Matches the release to a Component (by name) and an Environment (by namespace).
   * Skips without error when no matching component or environment is found.
   *
   * @param release - The Helm release to persist
   */
  private async upsertReleaseDeployment(release: HelmRelease): Promise<void> {
    const component = await this.componentRepository.findOne({
      where: { name: release.name },
    });
    if (!component) {
      this.logger.debug(
        `No component found for Helm release "${release.name}"; skipping`,
      );
      return;
    }

    const environment = await this.environmentRepository.findOne({
      where: { name: release.namespace },
    });
    if (!environment) {
      this.logger.debug(
        `No environment found for namespace "${release.namespace}"; skipping`,
      );
      return;
    }

    // Try to find an existing deployment tracked by helm release name.
    const existing = await this.deploymentRepository
      .createQueryBuilder("d")
      .where("d.componentId = :componentId", { componentId: component.id })
      .andWhere("d.environmentId = :environmentId", {
        environmentId: environment.id,
      })
      .getOne();

    const helmMeta = {
      helmReleaseName: release.name,
      helmNamespace: release.namespace,
      helmChart: release.chart,
      helmChartVersion: release.chartVersion,
      helmAppVersion: release.appVersion,
      helmRevision: release.revision,
      helmStatus: release.status,
      helmUpdatedAt: release.updatedAt,
    };

    if (existing) {
      existing.version = `${release.chart}@${release.chartVersion}`;
      existing.status = this.mapHelmStatus(release.status);
      existing.metadata = { ...(existing.metadata ?? {}), ...helmMeta };
      await this.deploymentRepository.save(existing);
      this.logger.debug(
        `Updated deployment for Helm release "${release.name}" (${release.namespace})`,
      );
    } else {
      const deployment = this.deploymentRepository.create({
        componentId: component.id,
        environmentId: environment.id,
        version: `${release.chart}@${release.chartVersion}`,
        status: this.mapHelmStatus(release.status),
        deployedBy: "helm-sync",
        description: `Synced from Helm release ${release.name} revision ${release.revision}`,
        metadata: helmMeta,
        startedAt: new Date(release.updatedAt),
      });
      await this.deploymentRepository.save(deployment);
      this.logger.log(
        `Created deployment for Helm release "${release.name}" (${release.namespace})`,
      );
    }
  }

  /**
   * Maps a Helm release status string to a Farm DeploymentStatus enum value.
   *
   * @param helmStatus - The Helm release status string
   * @returns The corresponding Farm DeploymentStatus
   */
  private mapHelmStatus(helmStatus: string): DeploymentStatus {
    switch (helmStatus) {
      case "deployed":
        return DeploymentStatus.SUCCEEDED;
      case "failed":
        return DeploymentStatus.FAILED;
      case "pending-install":
      case "pending-upgrade":
      case "pending-rollback":
        return DeploymentStatus.IN_PROGRESS;
      default:
        return DeploymentStatus.PENDING;
    }
  }
}
