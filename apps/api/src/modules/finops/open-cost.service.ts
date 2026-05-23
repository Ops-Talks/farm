import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

/**
 * Aggregated cost allocation returned by OpenCost for a single label selector.
 */
export interface OpenCostAllocation {
  cpuCost: number;
  memoryCost: number;
  pvCost: number;
  networkCost: number;
  totalCost: number;
  currency: string;
}

/**
 * Client service for the OpenCost Allocation API.
 * Returns null on any network or parse error rather than throwing.
 */
@Injectable()
export class OpenCostService {
  private readonly logger = new Logger(OpenCostService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cb: CircuitBreakerService,
  ) {
    this.baseUrl = this.configService.get<string>(
      "OPENCOST_URL",
      "http://localhost:9090",
    );
  }

  /**
   * Fetches a cost allocation summary from OpenCost for a given label selector
   * and time window.
   *
   * @param labelSelector - Value of the Kubernetes `app` label to filter by
   * @param window        - OpenCost time window string (e.g. "7d", "30d")
   * @returns Parsed OpenCostAllocation, or null when OpenCost is unavailable
   */
  async getAllocation(
    labelSelector: string,
    window: string,
  ): Promise<OpenCostAllocation | null> {
    try {
      const url = `${this.baseUrl}/model/allocation?window=${encodeURIComponent(window)}&aggregate=label:app&filterLabels=app:${encodeURIComponent(labelSelector)}`;
      const response = await this.cb.fire("open-cost", () =>
        globalThis.fetch(url),
      );
      if (!response.ok) {
        this.logger.warn(
          `OpenCost allocation request failed: ${response.status}`,
        );
        return null;
      }
      const data = (await response.json()) as {
        data?: Record<string, unknown>;
      };
      const allocations = data?.data;
      if (!allocations) return null;
      const entry = Object.values(allocations)[0] as
        | Record<string, unknown>
        | undefined;
      if (!entry) return null;
      return {
        cpuCost: Number(entry.cpuCost ?? 0),
        memoryCost: Number(entry.memoryCost ?? 0),
        pvCost: Number(entry.pvCost ?? 0),
        networkCost: Number(entry.networkCost ?? 0),
        totalCost: Number(entry.totalCost ?? 0),
        currency: typeof entry.currency === "string" ? entry.currency : "USD",
      };
    } catch (error) {
      this.logger.error(
        `OpenCost error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
