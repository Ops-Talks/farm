import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { GatewayRoute } from "./entities/gateway-route.entity";
import { ApiHealthCheck } from "./entities/api-health-check.entity";
import { GatewayService } from "./gateway.service";
import { GatewayScheduler } from "./gateway.scheduler";
import { GatewayController } from "./gateway.controller";
import { KongAdapter } from "./adapters/kong.adapter";
import { AwsApiGatewayAdapter } from "./adapters/aws-api-gateway.adapter";
import { IGatewayAdapter } from "./interfaces/gateway-adapter.interface";
import { GATEWAY_ADAPTERS } from "./gateway.constants";

export { GATEWAY_ADAPTERS } from "./gateway.constants";

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
      inject: [ConfigService],
      useFactory: (config: ConfigService): IGatewayAdapter[] => {
        const adapters: IGatewayAdapter[] = [];
        if (config.get<boolean>("gateway.kong.enabled")) {
          adapters.push(new KongAdapter(config));
        }
        if (config.get<boolean>("gateway.aws.enabled")) {
          adapters.push(new AwsApiGatewayAdapter(config));
        }
        return adapters;
      },
    },
  ],
  exports: [GatewayService],
})
export class GatewayModule {}
