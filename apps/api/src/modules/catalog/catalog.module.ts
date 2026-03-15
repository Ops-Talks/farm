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
      : [BullModule.registerQueue({ name: CATALOG_DISCOVERY_QUEUE })]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService, ...(isTest ? [] : [CatalogDiscoveryProcessor])],
  exports: [CatalogService],
})
export class CatalogModule {}
