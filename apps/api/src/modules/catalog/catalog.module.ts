import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { Component } from "./entities/component.entity";
import {
  CatalogDiscoveryProcessor,
  CATALOG_DISCOVERY_QUEUE,
} from "./processors/catalog-discovery.processor";
import {
  ContainerImageSyncProcessor,
  CONTAINER_IMAGE_SYNC_QUEUE,
} from "./processors/container-image-sync.processor";
import { ContainerImageSyncScheduler } from "./processors/container-image-sync.scheduler";
import { RegistryModule } from "../registry/registry.module";
import { FinOpsModule } from "../finops/finops.module";
import { PipelinesModule } from "../pipelines/pipelines.module";

const isTest = process.env.NODE_ENV === "test";

/**
 * Module for the software component catalog.
 * Manages all trackable software assets in the organization.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Component]),
    ...(isTest
      ? []
      : [
          BullModule.registerQueue({ name: CATALOG_DISCOVERY_QUEUE }),
          BullModule.registerQueue({ name: CONTAINER_IMAGE_SYNC_QUEUE }),
          RegistryModule,
        ]),
    FinOpsModule,
    PipelinesModule,
  ],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    ...(isTest
      ? []
      : [
          CatalogDiscoveryProcessor,
          ContainerImageSyncProcessor,
          ContainerImageSyncScheduler,
        ]),
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
