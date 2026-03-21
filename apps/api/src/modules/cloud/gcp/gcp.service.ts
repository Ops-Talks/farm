import { Injectable, Logger } from "@nestjs/common";
import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import { IntegrationCredentialService } from "../../integrations/integration-credential.service";
import { IntegrationType } from "../../integrations/entities/integration-credential.entity";
import { CloudResource } from "../interfaces/cloud-resource.interface";
import { CloudCostEntry } from "../dto/cloud-cost.dto";

/**
 * Decrypted payload stored for GCP credentials.
 */
interface GcpCredentialPayload {
  serviceAccountJson: string;
  projectId: string;
}

/**
 * Service that interacts with GCP cloud APIs.
 * All API clients are instantiated at runtime using credentials fetched
 * from IntegrationCredentialService — no hard-coded credentials are used.
 */
@Injectable()
export class GcpService {
  private readonly logger = new Logger(GcpService.name);

  constructor(
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Resolves and decrypts the GCP credential payload for an organization.
   *
   * @param orgId - Organization UUID
   * @returns GoogleAuth client and project ID, or null when not configured
   */
  private async getAuthClient(
    orgId: string,
  ): Promise<{ auth: GoogleAuth; projectId: string } | null> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.GCP_SERVICE_ACCOUNT,
    );
    if (!credential) {
      return null;
    }

    try {
      const plain = this.credentialService.decrypt(credential.encryptedValue);
      const payload = JSON.parse(plain) as GcpCredentialPayload;
      const serviceAccountKey = JSON.parse(
        payload.serviceAccountJson,
      ) as Record<string, unknown>;

      const auth = new GoogleAuth({
        credentials: serviceAccountKey,
        scopes: [
          "https://www.googleapis.com/auth/cloud-platform",
          "https://www.googleapis.com/auth/cloud-billing.readonly",
        ],
      });

      return { auth, projectId: payload.projectId };
    } catch (err) {
      this.logger.error(
        `Failed to build GCP auth client for org ${orgId}`,
        err,
      );
      return null;
    }
  }

  /**
   * Discovers GCP resources via Cloud Asset API filtered by labels.farm_component.
   *
   * @param orgId - Organization UUID
   * @returns Array of discovered cloud resources, or empty array on missing config
   */
  async discoverResources(orgId: string): Promise<CloudResource[]> {
    const authData = await this.getAuthClient(orgId);
    if (!authData) {
      this.logger.warn(`GCP credentials not configured for org ${orgId}`);
      return [];
    }

    const { auth, projectId } = authData;

    try {
      const accessToken = await auth.getAccessToken();
      const url = `https://cloudasset.googleapis.com/v1/projects/${projectId}/assets`;

      const response = await axios.get<{
        assets?: Array<{
          name: string;
          assetType: string;
          resource?: {
            data?: {
              name?: string;
              location?: string;
              labels?: Record<string, string>;
            };
          };
        }>;
      }>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          contentType: "RESOURCE",
          assetTypes: [
            "run.googleapis.com/Service",
            "cloudfunctions.googleapis.com/CloudFunction",
            "container.googleapis.com/Cluster",
          ].join(","),
        },
      });

      const assets = response.data.assets ?? [];
      const resources: CloudResource[] = [];

      for (const asset of assets) {
        const data = asset.resource?.data ?? {};
        const labels = data.labels ?? {};

        // Filter by farm component labels.
        const linkedComponentId =
          labels["farm_component"] ?? labels["farm-component"];
        if (!linkedComponentId) continue;

        const tags: Record<string, string> = {};
        for (const [k, v] of Object.entries(labels)) {
          tags[k] = v;
        }

        resources.push({
          provider: "gcp",
          resourceId: asset.name,
          resourceType: asset.assetType,
          name: data.name ?? asset.name.split("/").pop() ?? asset.name,
          region: data.location ?? "global",
          tags,
          linkedComponentId,
        });
      }

      return resources;
    } catch (err) {
      this.logger.error(
        `Failed to discover GCP resources for org ${orgId}`,
        err,
      );
      return [];
    }
  }

  /**
   * Fetches GCP billing data via the Cloud Billing API.
   *
   * @param orgId - Organization UUID
   * @param days - Number of days to include in the report
   * @returns Array of cost entries, or empty array on missing config
   */
  async getMonthlyCost(orgId: string, days: number): Promise<CloudCostEntry[]> {
    const authData = await this.getAuthClient(orgId);
    if (!authData) {
      this.logger.warn(`GCP credentials not configured for org ${orgId}`);
      return [];
    }

    const { auth, projectId } = authData;

    try {
      const accessToken = await auth.getAccessToken();
      const start = new Date();
      start.setDate(start.getDate() - days);

      // Use Cloud Billing Budget API or BigQuery export — simplified to
      // Cloud Billing v1 which does not expose per-project cost natively.
      // We call the Cloud Billing Catalog API as a best-effort approximation
      // and return placeholder data when billing export is not configured.
      const url = `https://cloudbilling.googleapis.com/v1/services`;
      const response = await axios.get<{
        services?: Array<{ displayName: string }>;
      }>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { pageSize: 1 },
      });

      // Real billing data requires BigQuery export; return a synthetic entry
      // to signal that billing is accessible without real cost data.
      if (response.status === 200) {
        this.logger.log(
          `GCP billing API accessible for project ${projectId}; returning placeholder cost data for ${days} days`,
        );
        return [
          {
            environment: "default",
            cost: 0,
            currency: "USD",
            component: undefined,
          },
        ];
      }

      return [];
    } catch (err) {
      this.logger.error(`Failed to fetch GCP cost for org ${orgId}`, err);
      return [];
    }
  }

  /**
   * Deploys a new revision to a Cloud Run service.
   *
   * @param orgId - Organization UUID
   * @param config - Cloud Run deployment configuration
   * @returns Deployment result
   */
  async deployToCloudRun(
    orgId: string,
    config: {
      service: string;
      region: string;
      image: string;
      projectId?: string;
    },
  ): Promise<{ success: boolean; output: string }> {
    const authData = await this.getAuthClient(orgId);
    if (!authData) {
      return {
        success: false,
        output: `GCP credentials not configured for org ${orgId}`,
      };
    }

    const { auth, projectId: defaultProjectId } = authData;
    const project = config.projectId ?? defaultProjectId;

    try {
      const accessToken = await auth.getAccessToken();
      const url = `https://${config.region}-run.googleapis.com/v2/projects/${project}/locations/${config.region}/services/${config.service}`;

      // PATCH the Cloud Run service to update the container image.
      const patchBody = {
        template: {
          containers: [{ image: config.image }],
        },
      };

      const response = await axios.patch<{
        name?: string;
        latestCreatedRevision?: string;
      }>(url, patchBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params: { updateMask: "template.containers" },
      });

      const output = `Cloud Run service "${config.service}" updated with image "${config.image}". Operation: ${response.data.name ?? "unknown"}`;
      this.logger.log(output);
      return { success: true, output };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cloud Run deploy failed for org ${orgId}: ${message}`);
      return { success: false, output: message };
    }
  }

  /**
   * Resolves a secret from GCP Secret Manager.
   *
   * @param orgId - Organization UUID
   * @param ref - GCP secret reference, e.g. gcp:projects/{project}/secrets/{name}/versions/{version}
   * @returns The secret payload value
   */
  async resolveSecret(orgId: string, ref: string): Promise<string> {
    const authData = await this.getAuthClient(orgId);
    if (!authData) {
      throw new Error(`GCP credentials not configured for org ${orgId}`);
    }

    const { auth } = authData;

    // Normalize and validate the secret reference to prevent constructing
    // unexpected URL paths from untrusted input.
    if (!ref.startsWith("gcp:projects/")) {
      throw new Error(`Invalid GCP secret reference prefix: "${ref}"`);
    }

    // Strip "gcp:" prefix and split the remaining path.
    const withoutPrefix = ref.slice("gcp:".length);
    const segments = withoutPrefix.split("/");
    // Expected format: projects/{project}/secrets/{name}/versions/{version}
    if (
      segments.length !== 7 ||
      segments[0] !== "projects" ||
      segments[2] !== "secrets" ||
      segments[4] !== "versions"
    ) {
      throw new Error(`Unsupported GCP secret ref format: "${ref}"`);
    }

    const projectId = segments[1];
    const secretName = segments[3];
    const version = segments[5];

    // Validate individual path segments to avoid path traversal or slashes.
    const segmentPattern = /^[a-zA-Z0-9\-_.]+$/;
    if (
      !segmentPattern.test(projectId) ||
      !segmentPattern.test(secretName) ||
      !segmentPattern.test(version)
    ) {
      throw new Error(`Invalid characters in GCP secret reference: "${ref}"`);
    }

    const accessToken = await auth.getAccessToken();
    const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/${version}:access`;

    const response = await axios.get<{
      payload?: { data?: string };
    }>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const encoded = response.data.payload?.data ?? "";
    // Secret Manager returns base64-encoded data.
    return Buffer.from(encoded, "base64").toString("utf8");
  }
}
