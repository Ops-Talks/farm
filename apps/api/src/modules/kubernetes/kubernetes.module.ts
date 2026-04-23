import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KubernetesService } from "./kubernetes.service";
import { KubernetesController } from "./kubernetes.controller";
import { KyvernoPolicyReportService } from "./kyverno-policy-report.service";
import { GatekeeperService } from "./gatekeeper.service";
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { FluxBindingService } from "./flux-binding.service";
import { FluxBinding } from "./entities/flux-binding.entity";
import { KedaBindingService } from "./keda-binding.service";
import { KedaBinding } from "./entities/keda-binding.entity";
import { ElasticStackService } from "./elastic-stack.service";
import { ThanosService } from "./thanos.service";
import { CatalogModule } from "../catalog/catalog.module";

/**
 * Module for Kubernetes cluster discovery.
 * Provides workload listing, CRD discovery, annotation-based catalog auto-registration,
 * Argo Rollouts status polling, Kyverno PolicyReport integration,
 * operator-to-component binding management, Flux GitOps integration,
 * and KEDA autoscaling visibility.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([OperatorBinding, FluxBinding, KedaBinding]),
    CatalogModule,
  ],
  controllers: [KubernetesController],
  providers: [
    KubernetesService,
    KyvernoPolicyReportService,
    GatekeeperService,
    OperatorBindingService,
    FluxBindingService,
    KedaBindingService,
    ElasticStackService,
    ThanosService,
  ],
  exports: [
    KubernetesService,
    KyvernoPolicyReportService,
    GatekeeperService,
    OperatorBindingService,
    FluxBindingService,
    KedaBindingService,
    ElasticStackService,
    ThanosService,
  ],
})
export class KubernetesModule {}
