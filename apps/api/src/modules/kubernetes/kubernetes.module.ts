import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KubernetesService } from "./kubernetes.service";
import { KubernetesController } from "./kubernetes.controller";
import { KyvernoPolicyReportService } from "./kyverno-policy-report.service";
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { CatalogModule } from "../catalog/catalog.module";

/**
 * Module for Kubernetes cluster discovery.
 * Provides workload listing, CRD discovery, annotation-based catalog auto-registration,
 * Argo Rollouts status polling, Kyverno PolicyReport integration,
 * and operator-to-component binding management.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([OperatorBinding]),
    CatalogModule,
  ],
  controllers: [KubernetesController],
  providers: [
    KubernetesService,
    KyvernoPolicyReportService,
    OperatorBindingService,
  ],
  exports: [
    KubernetesService,
    KyvernoPolicyReportService,
    OperatorBindingService,
  ],
})
export class KubernetesModule {}
