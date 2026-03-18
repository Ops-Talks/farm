import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Component } from "../catalog/entities/component.entity";
import { Deployment } from "../environments/entities/deployment.entity";
import { AuditLog } from "../audit-log/entities/audit-log.entity";

/**
 * Module for platform analytics including catalog health, DORA metrics,
 * and usage reports.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Component, Deployment, AuditLog])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
