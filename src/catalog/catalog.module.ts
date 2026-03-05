import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { Component } from "./entities/component.entity";

/**
 * Module for the software component catalog.
 * Manages all trackable software assets in the organization.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Component])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
