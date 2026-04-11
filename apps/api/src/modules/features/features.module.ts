import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { KubernetesModule } from "../kubernetes/kubernetes.module";
import { RegistryModule } from "../registry/registry.module";
import { IstioModule } from "../istio/istio.module";
import { FeaturesService } from "./features.service";
import { FeaturesController } from "./features.controller";

/**
 * Feature module that aggregates availability status for all optional
 * platform integrations (Kubernetes, cost, registry, Helm, Istio).
 */
@Module({
  imports: [ConfigModule, KubernetesModule, RegistryModule, IstioModule],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
