import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CircuitBreakerService } from "../../../common/circuit-breaker/circuit-breaker.service";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";
import {
  IGatewayAdapter,
  GatewayRouteDto,
  GatewayHealthDto,
} from "../interfaces/gateway-adapter.interface";

/**
 * Shape of a single route object returned by the Kong Admin API.
 */
interface KongRoute {
  id: string;
  name: string;
  paths: string[] | null;
  methods: string[] | null;
  tags: string[] | null;
}

/**
 * Paginated response wrapper from the Kong Admin API.
 */
interface KongRoutesPage {
  data: KongRoute[];
  next?: string | null;
}

/**
 * Shape of a single upstream target health entry from Kong.
 */
interface KongTargetHealth {
  data: Array<{
    health: string;
  }>;
}

/**
 * Shape of the Kong upstream list response.
 */
interface KongUpstreamsPage {
  data: Array<{ name: string }>;
}

/**
 * Adapter that communicates with the Kong Admin API to retrieve routes and
 * health information.
 *
 * Uses globalThis.fetch so it is easily mockable in unit tests without
 * introducing an HTTP client dependency.
 */
export class KongAdapter implements IGatewayAdapter {
  readonly type = GatewayType.KONG;

  private readonly logger = new Logger(KongAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cb?: CircuitBreakerService,
  ) {
    this.baseUrl = config.get<string>("gateway.kong.url") ?? "";
    this.apiKey = config.get<string>("gateway.kong.apiKey") ?? "";
  }

  /**
   * Issues a fetch request, routing through the circuit breaker when one is
   * configured.
   */
  private _fetch(url: string, init?: RequestInit): Promise<Response> {
    if (this.cb) {
      return this.cb.fire("kong", () => globalThis.fetch(url, init));
    }
    return globalThis.fetch(url, init);
  }

  /**
   * Builds the headers for Kong Admin API requests.
   * Includes the admin token only when an API key is configured.
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["kong-admin-token"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Fetches all routes from Kong, following pagination via the `next` field.
   */
  async getRoutes(): Promise<GatewayRouteDto[]> {
    const routes: GatewayRouteDto[] = [];
    let url: string | null = `${this.baseUrl}/routes?size=1000`;

    while (url) {
      const response = await this._fetch(url, {
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        this.logger.error(`Kong routes fetch failed: HTTP ${response.status}`);
        break;
      }

      const page = (await response.json()) as KongRoutesPage;

      for (const route of page.data) {
        routes.push({
          externalId: route.id,
          name: route.name,
          paths: route.paths ?? [],
          methods: route.methods ?? [],
          tags: route.tags ?? [],
          gatewayType: GatewayType.KONG,
        });
      }

      url = page.next ?? null;
    }

    this.logger.log(`Fetched ${routes.length} routes from Kong`);
    return routes;
  }

  /**
   * Fetches health information for all Kong upstreams.
   * For each upstream, queries the per-upstream health endpoint to determine
   * whether its targets are healthy.
   */
  async getHealth(): Promise<GatewayHealthDto[]> {
    const healthChecks: GatewayHealthDto[] = [];

    const upstreamsResponse = await this._fetch(`${this.baseUrl}/upstreams`, {
      headers: this.buildHeaders(),
    });

    if (!upstreamsResponse.ok) {
      this.logger.error(
        `Kong upstreams fetch failed: HTTP ${upstreamsResponse.status}`,
      );
      return healthChecks;
    }

    const upstreams = (await upstreamsResponse.json()) as KongUpstreamsPage;

    for (const upstream of upstreams.data) {
      try {
        const healthResponse = await this._fetch(
          `${this.baseUrl}/upstreams/${upstream.name}/health`,
          { headers: this.buildHeaders() },
        );

        if (!healthResponse.ok) {
          healthChecks.push({
            url: `${this.baseUrl}/upstreams/${upstream.name}`,
            status: HealthStatus.DOWN,
            latencyMs: null,
          });
          continue;
        }

        const healthData = (await healthResponse.json()) as KongTargetHealth;

        const hasUnhealthy = healthData.data.some(
          (t) => t.health === "UNHEALTHY" || t.health === "DNS_ERROR",
        );
        const hasDegraded = healthData.data.some(
          (t) => t.health === "HEALTHCHECKS_OFF",
        );

        let status: HealthStatus = HealthStatus.UP;
        if (hasUnhealthy) {
          status = HealthStatus.DOWN;
        } else if (hasDegraded) {
          status = HealthStatus.DEGRADED;
        }

        healthChecks.push({
          url: `${this.baseUrl}/upstreams/${upstream.name}`,
          status,
          latencyMs: null,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to fetch health for upstream ${upstream.name}: ${String(err)}`,
        );
        healthChecks.push({
          url: `${this.baseUrl}/upstreams/${upstream.name}`,
          status: HealthStatus.DOWN,
          latencyMs: null,
        });
      }
    }

    this.logger.log(`Fetched health for ${healthChecks.length} Kong upstreams`);
    return healthChecks;
  }
}
