import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";

/**
 * Normalized representation of a gateway route returned by an adapter.
 */
export interface GatewayRouteDto {
  externalId: string;
  name: string;
  paths: string[];
  methods: string[];
  tags: string[];
  gatewayType: GatewayType;
}

/**
 * Normalized representation of a health check result returned by an adapter.
 */
export interface GatewayHealthDto {
  url: string;
  status: HealthStatus;
  latencyMs: number | null;
  apiSpecId?: string;
}

/**
 * Contract that all gateway adapters must implement.
 */
export interface IGatewayAdapter {
  /**
   * The gateway provider type handled by this adapter.
   */
  readonly type: GatewayType;

  /**
   * Fetches all routes from the underlying gateway provider.
   */
  getRoutes(): Promise<GatewayRouteDto[]>;

  /**
   * Fetches health information from the underlying gateway provider.
   */
  getHealth(): Promise<GatewayHealthDto[]>;
}
