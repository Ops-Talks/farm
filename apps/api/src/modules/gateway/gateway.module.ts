import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { GatewayRoute } from "./entities/gateway-route.entity";
import { ApiHealthCheck } from "./entities/api-health-check.entity";
import { GatewayService } from "./gateway.service";
import { GatewayScheduler } from "./gateway.scheduler";
import { GatewayController } from "./gateway.controller";
import { KongAdapter } from "./adapters/kong.adapter";
import { AwsApiGatewayAdapter } from "./adapters/aws-api-gateway.adapter";
import { IGatewayAdapter } from "./interfaces/gateway-adapter.interface";
import { GATEWAY_ADAPTERS } from "./gateway.constants";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

export { GATEWAY_ADAPTERS } from "./gateway.constants";

/**
 * Factory that builds the list of enabled gateway adapters based on
 * environment configuration. Exported for direct unit testing.
 */
export function gatewayAdaptersFactory(
  config: ConfigService,
  httpService: HttpService,
  cb: CircuitBreakerService,
): IGatewayAdapter[] {
  const adapters: IGatewayAdapter[] = [];
  if (config.get<boolean>("gateway.kong.enabled")) {
    adapters.push(new KongAdapter(httpService, config, cb));
  }
  if (config.get<boolean>("gateway.aws.enabled")) {
    adapters.push(new AwsApiGatewayAdapter(config));
  }
  return adapters;
}

/**
 * Feature module for API Gateway integration.
 *
 * Provides:
 * - Route synchronization from Kong and AWS API Gateway
 * - Periodic health checks via the GatewayScheduler
 * - REST endpoints for querying routes and health results
 */
@Module({
  imports: [TypeOrmModule.forFeature([GatewayRoute, ApiHealthCheck])],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    GatewayScheduler,
    {
      provide: GATEWAY_ADAPTERS,
      inject: [ConfigService, HttpService, CircuitBreakerService],
      useFactory: gatewayAdaptersFactory,
    },
  ],
  exports: [GatewayService],
})
export class GatewayModule {}
