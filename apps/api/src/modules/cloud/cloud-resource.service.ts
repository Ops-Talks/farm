import { Injectable, Logger, Optional } from "@nestjs/common";
import { AwsService } from "./aws/aws.service";
import { GcpService } from "./gcp/gcp.service";
import { AzureService } from "./azure/azure.service";
import { CloudResource } from "./interfaces/cloud-resource.interface";
import { CloudCostEntry } from "./dto/cloud-cost.dto";

/**
 * Aggregated cost result per provider.
 */
export interface ProviderCostResult {
  provider: string;
  entries: CloudCostEntry[];
}

/**
 * Orchestrates cloud resource discovery and cost retrieval across all
 * configured cloud providers (AWS, GCP, Azure).
 *
 * Each provider service is injected as optional so that the module can
 * start even when provider packages are unavailable.
 */
@Injectable()
export class CloudResourceService {
  private readonly logger = new Logger(CloudResourceService.name);

  constructor(
    @Optional() private readonly awsService?: AwsService,
    @Optional() private readonly gcpService?: GcpService,
    @Optional() private readonly azureService?: AzureService,
  ) {}

  /**
   * Discovers resources from all connected providers for an org.
   * Failures from individual providers are logged and skipped — the method
   * always returns a (possibly empty) array.
   *
   * @param orgId - Organization UUID
   * @returns Aggregated cloud resources from all providers
   */
  async discoverAll(orgId: string): Promise<CloudResource[]> {
    const results = await Promise.allSettled([
      this.awsService
        ? this.awsService.discoverResources(orgId)
        : Promise.resolve([]),
      this.gcpService
        ? this.gcpService.discoverResources(orgId)
        : Promise.resolve([]),
      this.azureService
        ? this.azureService.discoverResources(orgId)
        : Promise.resolve([]),
    ]);

    const resources: CloudResource[] = [];
    const providerNames = ["aws", "gcp", "azure"];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        resources.push(...result.value);
      } else {
        this.logger.error(
          `Failed to discover ${providerNames[i]} resources for org ${orgId}`,
          result.reason,
        );
      }
    }

    return resources;
  }

  /**
   * Discovers resources from a specific cloud provider.
   *
   * @param orgId - Organization UUID
   * @param provider - Target provider
   * @returns Cloud resources for the provider
   */
  async discoverByProvider(
    orgId: string,
    provider: "aws" | "gcp" | "azure",
  ): Promise<CloudResource[]> {
    switch (provider) {
      case "aws":
        return this.awsService ? this.awsService.discoverResources(orgId) : [];
      case "gcp":
        return this.gcpService ? this.gcpService.discoverResources(orgId) : [];
      case "azure":
        return this.azureService
          ? this.azureService.discoverResources(orgId)
          : [];
      default:
        return [];
    }
  }

  /**
   * Fetches aggregated cost from all configured providers.
   *
   * @param orgId - Organization UUID
   * @param days - Number of days to include in the report
   * @returns Array of per-provider cost results
   */
  async getAggregatedCost(
    orgId: string,
    days: number,
  ): Promise<ProviderCostResult[]> {
    const [awsResult, gcpResult, azureResult] = await Promise.allSettled([
      this.awsService
        ? this.awsService.getMonthlyCost(orgId, days)
        : Promise.resolve([]),
      this.gcpService
        ? this.gcpService.getMonthlyCost(orgId, days)
        : Promise.resolve([]),
      this.azureService
        ? this.azureService.getMonthlyCost(orgId, days)
        : Promise.resolve([]),
    ]);

    const output: ProviderCostResult[] = [];

    if (awsResult.status === "fulfilled" && awsResult.value.length > 0) {
      output.push({ provider: "aws", entries: awsResult.value });
    } else if (awsResult.status === "rejected") {
      this.logger.error(
        `AWS cost fetch failed for org ${orgId}`,
        awsResult.reason,
      );
    }

    if (gcpResult.status === "fulfilled" && gcpResult.value.length > 0) {
      output.push({ provider: "gcp", entries: gcpResult.value });
    } else if (gcpResult.status === "rejected") {
      this.logger.error(
        `GCP cost fetch failed for org ${orgId}`,
        gcpResult.reason,
      );
    }

    if (azureResult.status === "fulfilled" && azureResult.value.length > 0) {
      output.push({ provider: "azure", entries: azureResult.value });
    } else if (azureResult.status === "rejected") {
      this.logger.error(
        `Azure cost fetch failed for org ${orgId}`,
        azureResult.reason,
      );
    }

    return output;
  }

  /**
   * Resolves a secret reference to its plain-text value.
   * Provider is auto-detected from the ref prefix.
   *
   * @param ref - Secret reference string
   * @param orgId - Organization UUID
   * @returns Resolved plain-text secret value
   */
  async resolveSecret(ref: string, orgId: string): Promise<string> {
    if (ref.startsWith("arn:aws:secretsmanager")) {
      if (!this.awsService) throw new Error("AWS service not available");
      return this.awsService.resolveSecret(orgId, ref);
    }
    if (ref.startsWith("gcp:")) {
      if (!this.gcpService) throw new Error("GCP service not available");
      return this.gcpService.resolveSecret(orgId, ref);
    }
    if (ref.startsWith("azure:")) {
      if (!this.azureService) throw new Error("Azure service not available");
      // ref format: azure:{vaultUrl}:{secretName}
      const withoutPrefix = ref.slice("azure:".length);
      const vaultEnd = withoutPrefix.lastIndexOf(":");
      const vaultUrl = withoutPrefix.slice(0, vaultEnd);
      const secretName = withoutPrefix.slice(vaultEnd + 1);
      return this.azureService.resolveSecret(orgId, vaultUrl, secretName);
    }
    throw new Error(`Unsupported secret ref format: ${ref}`);
  }

  /**
   * Lists which providers are connected (have credentials) for an org.
   *
   * @param orgId - Organization UUID
   * @returns Array of provider identifiers that have resources configured
   */
  async listConnectedProviders(orgId: string): Promise<string[]> {
    const providers: string[] = [];

    const checks = await Promise.allSettled([
      this.awsService
        ? this.awsService.discoverResources(orgId)
        : Promise.resolve(null),
      this.gcpService
        ? this.gcpService.discoverResources(orgId)
        : Promise.resolve(null),
      this.azureService
        ? this.azureService.discoverResources(orgId)
        : Promise.resolve(null),
    ]);

    const names = ["aws", "gcp", "azure"] as const;
    for (let i = 0; i < checks.length; i++) {
      const result = checks[i];
      // If the call succeeds (even returning empty array) the provider is connected.
      if (result.status === "fulfilled" && result.value !== null) {
        providers.push(names[i]);
      }
    }

    return providers;
  }
}
