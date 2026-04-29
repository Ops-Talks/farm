import { Injectable, Logger } from "@nestjs/common";
import { ClientSecretCredential } from "@azure/identity";
import {
  ResourceManagementClient,
  type GenericResourceExpanded,
} from "@azure/arm-resources";
import { SecretClient } from "@azure/keyvault-secrets";
import { CostManagementClient } from "@azure/arm-costmanagement";
import axios from "axios";
import { IntegrationCredentialService } from "../../integrations/integration-credential.service";
import { IntegrationType } from "../../integrations/entities/integration-credential.entity";
import { CloudResource } from "../interfaces/cloud-resource.interface";
import { CloudCostEntry } from "../dto/cloud-cost.dto";

/**
 * Decrypted payload stored for Azure credentials.
 */
interface AzureCredentialPayload {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

/**
 * Service that interacts with Azure cloud APIs.
 * All SDK clients are instantiated at runtime using credentials fetched
 * from IntegrationCredentialService — no hard-coded credentials are used.
 */
@Injectable()
export class AzureService {
  private readonly logger = new Logger(AzureService.name);

  constructor(
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Resolves and decrypts the Azure credential payload for an organization.
   *
   * @param orgId - Organization UUID
   * @returns ClientSecretCredential and subscriptionId, or null when not configured
   */
  private async getCredential(orgId: string): Promise<{
    credential: ClientSecretCredential;
    subscriptionId: string;
  } | null> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.AZURE_SERVICE_PRINCIPAL,
    );
    if (!credential) {
      return null;
    }

    try {
      const plain = this.credentialService.decrypt(credential.encryptedValue);
      const payload = JSON.parse(plain) as AzureCredentialPayload;

      const clientCredential = new ClientSecretCredential(
        payload.tenantId,
        payload.clientId,
        payload.clientSecret,
      );

      return {
        credential: clientCredential,
        subscriptionId: payload.subscriptionId,
      };
    } catch (err) {
      this.logger.error(
        `Failed to build Azure credential for org ${orgId}`,
        err,
      );
      return null;
    }
  }

  /**
   * Discovers Azure resources via ARM filtered by farm:component or
   * farm.io/component tags.
   *
   * @param orgId - Organization UUID
   * @returns Array of discovered cloud resources, or empty array on missing config
   */
  async discoverResources(orgId: string): Promise<CloudResource[]> {
    const credData = await this.getCredential(orgId);
    if (!credData) {
      this.logger.warn(`Azure credentials not configured for org ${orgId}`);
      return [];
    }

    const { credential, subscriptionId } = credData;
    const client = new ResourceManagementClient(credential, subscriptionId);

    const resources: CloudResource[] = [];

    try {
      const resourceList = client.resources.list({
        filter: "tagName eq 'farm:component' or tagName eq 'farm.io/component'",
      }) as unknown as AsyncIterable<GenericResourceExpanded>;

      for await (const resource of resourceList) {
        if (!resource.id) continue;
        const tags: Record<string, string> = {};
        for (const [k, v] of Object.entries(resource.tags ?? {})) {
          if (v !== undefined) tags[k] = v;
        }

        const linkedComponentId =
          tags["farm:component"] ?? tags["farm.io/component"];
        const region = resource.location ?? "unknown";

        resources.push({
          provider: "azure",
          resourceId: resource.id,
          resourceType: resource.type ?? "unknown",
          name: resource.name ?? resource.id.split("/").pop() ?? resource.id,
          region,
          tags,
          linkedComponentId,
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to discover Azure resources for org ${orgId}`,
        err,
      );
      return [];
    }

    return resources;
  }

  /**
   * Fetches Azure cost data from Cost Management API.
   *
   * @param orgId - Organization UUID
   * @param days - Number of days to include in the report
   * @returns Array of cost entries, or empty array on missing config
   */
  async getMonthlyCost(orgId: string, days: number): Promise<CloudCostEntry[]> {
    const credData = await this.getCredential(orgId);
    if (!credData) {
      this.logger.warn(`Azure credentials not configured for org ${orgId}`);
      return [];
    }

    const { credential, subscriptionId } = credData;
    const client = new CostManagementClient(credential);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const toDateStr = (d: Date): string => d.toISOString().split("T")[0];

    try {
      const scope = `/subscriptions/${subscriptionId}`;
      const result = await client.query.usage(scope, {
        type: "ActualCost",
        timeframe: "Custom",
        timePeriod: {
          from: new Date(toDateStr(start)),
          to: new Date(toDateStr(end)),
        },
        dataset: {
          granularity: "None",
          aggregation: {
            totalCost: {
              name: "Cost",
              function: "Sum",
            },
          },
          grouping: [
            {
              type: "TagKey",
              name: "farm:environment",
            },
          ],
        },
      });

      const entries: CloudCostEntry[] = [];
      const rows = result.rows ?? [];
      const columns = result.columns ?? [];
      const costIdx = columns.findIndex((c) => c.name === "Cost");
      const envIdx = columns.findIndex((c) =>
        c.name?.toLowerCase().includes("environment"),
      );
      const currencyIdx = columns.findIndex((c) => c.name === "Currency");

      for (const row of rows) {
        const cost = costIdx >= 0 ? ((row[costIdx] as number) ?? 0) : 0;
        const environment =
          envIdx >= 0 ? String(row[envIdx] ?? "untagged") : "untagged";
        const currency =
          currencyIdx >= 0 ? String(row[currencyIdx] ?? "USD") : "USD";

        entries.push({ environment, cost, currency });
      }

      return entries;
    } catch (err) {
      this.logger.error(`Failed to fetch Azure cost for org ${orgId}`, err);
      return [];
    }
  }

  /**
   * Deploys a new container image to an Azure Container App.
   *
   * @param orgId - Organization UUID
   * @param config - Container Apps deployment configuration
   * @returns Deployment result
   */
  async deployToContainerApps(
    orgId: string,
    config: { resourceGroup: string; appName: string; image: string },
  ): Promise<{ success: boolean; output: string }> {
    const credData = await this.getCredential(orgId);
    if (!credData) {
      return {
        success: false,
        output: `Azure credentials not configured for org ${orgId}`,
      };
    }

    const { credential, subscriptionId } = credData;

    try {
      // Azure Container Apps REST API (2023-05-01 stable).
      const token = await credential.getToken(
        "https://management.azure.com/.default",
      );
      const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.App/containerApps/${config.appName}?api-version=2023-05-01`;

      // Fetch current app definition first.
      const getResponse = await axios.get<{
        properties?: {
          template?: {
            containers?: Array<{ name?: string; image?: string }>;
          };
        };
      }>(url, {
        headers: { Authorization: `Bearer ${token.token}` },
      });

      const appDef = getResponse.data;
      const containers = appDef.properties?.template?.containers ?? [];
      if (containers.length > 0) {
        containers[0].image = config.image;
      }

      // PATCH the container app with updated image.
      const patchResponse = await axios.patch<{ name?: string }>(url, appDef, {
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
      });

      const output = `Container App "${config.appName}" updated with image "${config.image}". Name: ${patchResponse.data.name ?? "unknown"}`;
      this.logger.log(output);
      return { success: true, output };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Container Apps deploy failed for org ${orgId}: ${message}`,
      );
      return { success: false, output: message };
    }
  }

  /**
   * Resolves a secret from Azure Key Vault.
   *
   * @param orgId - Organization UUID
   * @param vaultUrl - Key Vault base URL, e.g. https://my-vault.vault.azure.net
   * @param secretName - Secret name within the vault
   * @returns The secret value string
   */
  async resolveSecret(
    orgId: string,
    vaultUrl: string,
    secretName: string,
  ): Promise<string> {
    const credData = await this.getCredential(orgId);
    if (!credData) {
      throw new Error(`Azure credentials not configured for org ${orgId}`);
    }

    const { credential } = credData;
    const client = new SecretClient(vaultUrl, credential);
    const secret = await client.getSecret(secretName);
    return secret.value ?? "";
  }
}
