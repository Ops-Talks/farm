import { Injectable, Logger, Optional } from "@nestjs/common";
import {
  CloudResourceService,
  ProviderCostResult,
} from "./cloud-resource.service";
import { CloudCostEntry } from "./dto/cloud-cost.dto";

/**
 * Thin wrapper around CloudResourceService that exposes cost-specific operations.
 * Designed as a focused service for the cost sub-domain of cloud resource management.
 */
@Injectable()
export class CloudCostService {
  private readonly logger = new Logger(CloudCostService.name);

  constructor(
    @Optional() private readonly cloudResourceService?: CloudResourceService,
  ) {}

  /**
   * Retrieves aggregated cost data from all configured cloud providers.
   *
   * @param orgId - Organization UUID
   * @param days - Number of days to include in the report (default 30)
   * @returns Aggregated cost results per provider
   */
  async getAggregatedCost(
    orgId: string,
    days = 30,
  ): Promise<ProviderCostResult[]> {
    if (!this.cloudResourceService) {
      this.logger.warn("CloudResourceService not available");
      return [];
    }
    return this.cloudResourceService.getAggregatedCost(orgId, days);
  }

  /**
   * Flattens per-provider cost entries into a single array with provider info.
   *
   * @param orgId - Organization UUID
   * @param days - Number of days to include in the report
   * @returns Flat array of cost entries annotated with the originating provider
   */
  async getFlatCostEntries(
    orgId: string,
    days = 30,
  ): Promise<Array<CloudCostEntry & { provider: string }>> {
    const aggregated = await this.getAggregatedCost(orgId, days);
    const flat: Array<CloudCostEntry & { provider: string }> = [];

    for (const providerResult of aggregated) {
      for (const entry of providerResult.entries) {
        flat.push({ ...entry, provider: providerResult.provider });
      }
    }

    return flat;
  }
}
