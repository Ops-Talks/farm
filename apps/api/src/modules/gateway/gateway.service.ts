import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { EventsGateway } from "../../common/events/events.gateway";
import { FarmEvent } from "../../common/events/events.interfaces";
import { GatewayRoute } from "./entities/gateway-route.entity";
import { ApiHealthCheck } from "./entities/api-health-check.entity";
import {
  IGatewayAdapter,
  GatewayHealthDto,
} from "./interfaces/gateway-adapter.interface";
import { GATEWAY_ADAPTERS } from "./gateway.constants";

/**
 * Service responsible for synchronizing gateway routes, executing health
 * checks, and providing query methods for the gateway data.
 */
@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    @InjectRepository(GatewayRoute)
    private readonly routeRepo: Repository<GatewayRoute>,
    @InjectRepository(ApiHealthCheck)
    private readonly healthCheckRepo: Repository<ApiHealthCheck>,
    @Inject(GATEWAY_ADAPTERS)
    private readonly adapters: IGatewayAdapter[],
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Iterates over all enabled adapters and upserts their routes into the
   * gateway_routes table. Sets syncedAt on each upserted record and emits a
   * GATEWAY_ROUTE_SYNCED WebSocket event after completion.
   */
  async syncRoutes(): Promise<void> {
    for (const adapter of this.adapters) {
      this.logger.log(`Syncing routes from ${adapter.type}`);

      try {
        const dtos = await adapter.getRoutes();

        for (const dto of dtos) {
          let route = await this.routeRepo.findOne({
            where: { externalId: dto.externalId, gatewayType: dto.gatewayType },
          });

          if (!route) {
            route = this.routeRepo.create({
              externalId: dto.externalId,
              gatewayType: dto.gatewayType,
            });
          }

          route.name = dto.name;
          route.paths = dto.paths;
          route.methods = dto.methods;
          route.tags = dto.tags;
          route.syncedAt = new Date();

          await this.routeRepo.save(route);
        }

        this.logger.log(`Synced ${dtos.length} routes from ${adapter.type}`);

        this.eventsGateway.server?.emit(FarmEvent.GATEWAY_ROUTE_SYNCED, {
          gatewayType: adapter.type,
          count: dtos.length,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        this.logger.error(
          `Route sync failed for adapter ${adapter.type}: ${String(err)}`,
        );
      }
    }
  }

  /**
   * Iterates over all enabled adapters, runs health checks, persists the
   * results, and emits an API_HEALTH_CHANGED event when the status differs
   * from the most recent stored check for the same URL.
   */
  async triggerHealthCheck(): Promise<void> {
    for (const adapter of this.adapters) {
      this.logger.log(`Running health check via ${adapter.type}`);

      try {
        const healthDtos: GatewayHealthDto[] = await adapter.getHealth();

        for (const dto of healthDtos) {
          const previous = await this.healthCheckRepo.findOne({
            where: { url: dto.url },
            order: { checkedAt: "DESC" },
          });

          const record = this.healthCheckRepo.create({
            url: dto.url,
            status: dto.status,
            latencyMs: dto.latencyMs,
            apiSpecId: dto.apiSpecId ?? null,
            checkedAt: new Date(),
          });

          await this.healthCheckRepo.save(record);

          if (!previous || previous.status !== dto.status) {
            this.eventsGateway.server?.emit(FarmEvent.API_HEALTH_CHANGED, {
              url: dto.url,
              previousStatus: previous?.status ?? null,
              currentStatus: dto.status,
              timestamp: new Date().toISOString(),
            });
          }
        }

        this.logger.log(
          `Saved ${healthDtos.length} health checks from ${adapter.type}`,
        );
      } catch (err) {
        this.logger.error(
          `Health check failed for adapter ${adapter.type}: ${String(err)}`,
        );
      }
    }
  }

  /**
   * Returns all gateway routes, optionally filtered by catalog component and
   * organization.
   *
   * @param componentId - Optional UUID of a catalog component
   * @param organizationId - Optional UUID of an organization
   */
  async findAllRoutes(
    componentId?: string,
    organizationId?: string,
  ): Promise<GatewayRoute[]> {
    const where: Record<string, unknown> = {};
    if (componentId) where.componentId = componentId;
    if (organizationId) where.organizationId = organizationId;

    return this.routeRepo.find({
      ...(Object.keys(where).length > 0 ? { where } : {}),
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Returns a single gateway route by its UUID.
   *
   * @param id - UUID of the gateway route
   * @throws NotFoundException when no route is found
   */
  async findOneRoute(id: string): Promise<GatewayRoute> {
    const route = await this.routeRepo.findOneBy({ id });
    if (!route) {
      throw new NotFoundException(`Gateway route ${id} not found`);
    }
    return route;
  }

  /**
   * Returns all health check records, optionally filtered by API spec, ordered
   * by checkedAt descending.
   *
   * @param apiSpecId - Optional UUID of an API spec
   */
  async findAllHealthChecks(apiSpecId?: string): Promise<ApiHealthCheck[]> {
    if (apiSpecId) {
      return this.healthCheckRepo.find({
        where: { apiSpecId },
        order: { checkedAt: "DESC" },
      });
    }
    return this.healthCheckRepo.find({ order: { checkedAt: "DESC" } });
  }
}
