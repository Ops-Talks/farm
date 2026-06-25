import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnvironmentRequestService } from "./environment-request.service";
import { EnvironmentRequestController } from "./environment-request.controller";
import { EnvironmentRequest } from "./entities/environment-request.entity";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Module for managing developer self-service environment requests,
 * including approval workflows and lifecycle management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([EnvironmentRequest])],
  controllers: [EnvironmentRequestController],
  providers: [EnvironmentRequestService],
  exports: [EnvironmentRequestService],
})
export class EnvironmentRequestModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-environment-requests",
    version: "1.0.0",
    description:
      "Self-service environment provisioning with approval workflows",
  };
}
