import { Module } from "@nestjs/common";
import { KubernetesService } from "./kubernetes.service";
import { KubernetesController } from "./kubernetes.controller";

/**
 * Module for Kubernetes cluster discovery.
 * Provides workload listing and catalog component matching capabilities.
 */
@Module({
  controllers: [KubernetesController],
  providers: [KubernetesService],
  exports: [KubernetesService],
})
export class KubernetesModule {}
