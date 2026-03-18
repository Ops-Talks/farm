import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { KubernetesService } from "./kubernetes.service";
import { KubernetesController } from "./kubernetes.controller";
import { CatalogModule } from "../catalog/catalog.module";

/**
 * Module for Kubernetes cluster discovery.
 * Provides workload listing, CRD discovery, annotation-based catalog auto-registration,
 * and Argo Rollouts status polling.
 */
@Module({
  imports: [ScheduleModule.forRoot(), CatalogModule],
  controllers: [KubernetesController],
  providers: [KubernetesService],
  exports: [KubernetesService],
})
export class KubernetesModule {}
