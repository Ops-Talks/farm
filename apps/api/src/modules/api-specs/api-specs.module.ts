import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiSpec } from "./entities/api-spec.entity";
import { ApiConsumer } from "./entities/api-consumer.entity";
import { ApiSpecsService } from "./api-specs.service";
import { SpecDiffService } from "./spec-diff.service";
import {
  ApiSpecsController,
  ApiSpecsComponentController,
  ConsumedApisController,
} from "./api-specs.controller";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Feature module for API catalog and lifecycle management.
 *
 * Provides:
 * - API spec CRUD (ApiSpecsService + controllers)
 * - Consumer registration and tracking
 * - Structural spec diff via SpecDiffService
 */
@Module({
  imports: [TypeOrmModule.forFeature([ApiSpec, ApiConsumer])],
  controllers: [
    ApiSpecsController,
    ApiSpecsComponentController,
    ConsumedApisController,
  ],
  providers: [ApiSpecsService, SpecDiffService],
  exports: [ApiSpecsService],
})
export class ApiSpecsModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-api-specs",
    version: "1.0.0",
    description:
      "API catalog and lifecycle management: spec versioning, consumer tracking, and structural diff",
  };
}
