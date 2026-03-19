import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { KubernetesService } from "./kubernetes.service";
import { KubernetesController } from "./kubernetes.controller";
import { KyvernoPolicyReportService } from "./kyverno-policy-report.service";
import { CatalogModule } from "../catalog/catalog.module";

/**
 * Module for Kubernetes cluster discovery.
 * Provides workload listing, CRD discovery, annotation-based catalog auto-registration,
 * Argo Rollouts status polling, and Kyverno PolicyReport integration.
 */
@Module({
  imports: [ScheduleModule.forRoot(), CatalogModule],
  controllers: [KubernetesController],
  providers: [KubernetesService, KyvernoPolicyReportService],
  exports: [KubernetesService, KyvernoPolicyReportService],
})
export class KubernetesModule {}
