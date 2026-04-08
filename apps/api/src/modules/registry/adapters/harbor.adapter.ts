import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RegistryType } from "../enums/registry-type.enum";
import {
  IRegistryAdapter,
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
  VulnerabilityDto,
  HarborReplicationPolicy,
} from "../interfaces/registry-adapter.interface";

/**
 * Parsed Harbor credentials.
 */
interface HarborCredentials {
  username: string;
  password: string;
}

/** Harbor project response shape */
interface HarborProject {
  name: string;
  project_id: number;
}

/** Harbor repository response shape */
interface HarborRepository {
  name: string;
  description?: string;
  artifact_count?: number;
}

/** Harbor artifact (image tag) response shape */
interface HarborArtifact {
  digest: string;
  media_type?: string;
  size?: number;
  push_time?: string;
  tags?: Array<{ name: string }>;
}

/** Harbor vulnerability scan report shape */
interface HarborScanReport {
  vulnerabilities?: Array<{
    id: string;
    severity: string;
    package: string;
    version?: string;
    fix_version?: string;
    description?: string;
  }>;
}

/**
 * Adapter for Harbor container registry.
 *
 * Authenticates using HTTP Basic Auth (username:password base64-encoded).
 * Config keys:
 *   - registry.url         Harbor base URL (e.g. https://harbor.example.com)
 *   - registry.credentials JSON string { "username": "...", "password": "..." }
 */
export class HarborAdapter implements IRegistryAdapter {
  readonly type = RegistryType.HARBOR;

  private readonly logger = new Logger(HarborAdapter.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (config.get<string>("registry.url") ?? "").replace(
      /\/$/,
      "",
    );
    const rawCredentials = config.get<string>("registry.credentials") ?? "{}";
    let credentials: HarborCredentials = { username: "", password: "" };
    try {
      credentials = JSON.parse(rawCredentials) as HarborCredentials;
    } catch {
      this.logger.error(
        "Failed to parse Harbor credentials JSON; adapter will use empty credentials",
      );
    }
    const encoded = Buffer.from(
      `${credentials.username ?? ""}:${credentials.password ?? ""}`,
    ).toString("base64");
    this.authHeader = `Basic ${encoded}`;
  }

  /**
   * Performs a GET request to the Harbor API and returns the parsed JSON body.
   */
  private async fetchJson<T>(path: string): Promise<T> {
    const response = await globalThis.fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Harbor request failed: HTTP ${response.status} ${path}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Lists all repositories across all Harbor projects.
   */
  async listRepositories(): Promise<RepositoryDto[]> {
    const projects = await this.fetchJson<HarborProject[]>(
      "/api/v2.0/projects?page_size=100",
    );
    const repos: RepositoryDto[] = [];
    for (const project of projects) {
      const projectRepos = await this.fetchJson<HarborRepository[]>(
        `/api/v2.0/projects/${encodeURIComponent(project.name)}/repositories?page_size=100`,
      );
      for (const r of projectRepos) {
        repos.push({
          name: r.name,
          uri: `${this.baseUrl.replace(/https?:\/\//, "")}/${r.name}`,
          description: r.description ?? undefined,
        });
      }
    }
    this.logger.log(`Fetched ${repos.length} repositories from Harbor`);
    return repos;
  }

  /**
   * Lists all tags for a given repository.
   *
   * @param repo - Repository in "project/repository-name" format
   */
  async listTags(repo: string): Promise<TagDto[]> {
    const [project, ...repoParts] = repo.split("/");
    const repoName = repoParts.join("/");
    const artifacts = await this.fetchJson<HarborArtifact[]>(
      `/api/v2.0/projects/${encodeURIComponent(project)}/repositories/${encodeURIComponent(repoName)}/artifacts?page_size=100&with_tag=true`,
    );
    return artifacts.flatMap((a) =>
      (a.tags ?? [{ name: a.digest.substring(7, 19) }]).map((t) => ({
        tag: t.name,
        digest: a.digest,
        pushedAt: a.push_time ? new Date(a.push_time) : undefined,
        sizeBytes: a.size ?? undefined,
      })),
    );
  }

  /**
   * Returns the manifest for a specific image tag.
   *
   * @param repo - Repository in "project/repository-name" format
   * @param tag  - Image tag or digest reference
   */
  async getManifest(repo: string, tag: string): Promise<ManifestDto> {
    const [project, ...repoParts] = repo.split("/");
    const repoName = repoParts.join("/");
    const artifact = await this.fetchJson<HarborArtifact>(
      `/api/v2.0/projects/${encodeURIComponent(project)}/repositories/${encodeURIComponent(repoName)}/artifacts/${encodeURIComponent(tag)}`,
    );
    return {
      digest: artifact.digest,
      mediaType:
        artifact.media_type ??
        "application/vnd.docker.distribution.manifest.v2+json",
      sizeBytes: artifact.size ?? undefined,
      pushedAt: artifact.push_time ? new Date(artifact.push_time) : undefined,
      tags: (artifact.tags ?? []).map((t) => t.name),
    };
  }

  /**
   * Returns vulnerability scan results for a specific image tag.
   * Returns PENDING when the scan has not completed, FAILED on errors.
   *
   * @param repo - Repository in "project/repository-name" format
   * @param tag  - Image tag or digest reference
   */
  async getScanResults(repo: string, tag: string): Promise<ScanResultDto> {
    const [project, ...repoParts] = repo.split("/");
    const repoName = repoParts.join("/");
    try {
      const reportPath =
        `/api/v2.0/projects/${encodeURIComponent(project)}` +
        `/repositories/${encodeURIComponent(repoName)}` +
        `/artifacts/${encodeURIComponent(tag)}/additions/vulnerabilities`;
      const report =
        await this.fetchJson<Record<string, HarborScanReport>>(reportPath);

      // Harbor returns a map of mediaType -> report; use the first entry
      const scanReport = Object.values(report)[0];
      if (!scanReport?.vulnerabilities) {
        return { status: "PENDING", vulnerabilities: [] };
      }

      const vulns: VulnerabilityDto[] = scanReport.vulnerabilities.map((v) => ({
        cveId: v.id,
        severity: this.mapSeverity(v.severity),
        packageName: v.package,
        installedVersion: v.version ?? undefined,
        fixedVersion: v.fix_version ?? undefined,
        description: v.description ?? undefined,
      }));

      return { status: "COMPLETE", vulnerabilities: vulns };
    } catch {
      return { status: "FAILED", vulnerabilities: [] };
    }
  }

  /**
   * Lists all Harbor replication policies and their last execution status.
   * This method is specific to Harbor and is not part of IRegistryAdapter.
   */
  async listReplicationPolicies(): Promise<HarborReplicationPolicy[]> {
    interface RawPolicy {
      id: number;
      name?: string;
      src_registry?: { name?: string; url?: string } | null;
      dest_registry?: { name?: string; url?: string } | null;
      filters?: Array<{ type?: string; value?: string }>;
      trigger?: { type?: string };
      enabled?: boolean;
    }
    interface RawExecution {
      status?: string;
    }

    const policies = await this.fetchJson<RawPolicy[]>(
      "/api/v2.0/replication/policies?page_size=100",
    );

    const results: HarborReplicationPolicy[] = [];
    for (const p of policies) {
      let lastExecutionStatus: string | null = null;
      try {
        const executions = await this.fetchJson<RawExecution[]>(
          `/api/v2.0/replication/executions?policy_id=${p.id}&page_size=1`,
        );
        lastExecutionStatus = executions[0]?.status ?? null;
      } catch {
        // Execution history is optional; ignore fetch failures
      }

      results.push({
        id: p.id,
        name: p.name ?? "",
        srcRegistry: p.src_registry?.name ?? p.src_registry?.url ?? "local",
        destRegistry: p.dest_registry?.name ?? p.dest_registry?.url ?? "local",
        filters: (p.filters ?? [])
          .filter((f) => f.type === "name")
          .map((f) => f.value ?? "*"),
        triggerType: p.trigger?.type ?? "manual",
        enabled: p.enabled ?? true,
        lastExecutionStatus,
      });
    }
    return results;
  }

  /**
   * Maps a Harbor severity string to the canonical VulnerabilityDto severity.
   */
  private mapSeverity(severity: string): VulnerabilityDto["severity"] {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return "CRITICAL";
      case "HIGH":
        return "HIGH";
      case "MEDIUM":
        return "MEDIUM";
      case "LOW":
        return "LOW";
      case "NEGLIGIBLE":
      case "INFORMATIONAL":
        return "INFORMATIONAL";
      default:
        return "UNDEFINED";
    }
  }
}
