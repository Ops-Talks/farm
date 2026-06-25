import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { KubernetesModule } from "../kubernetes/kubernetes.module";
import { RegistryModule } from "../registry/registry.module";
import { IstioModule } from "../istio/istio.module";
import { LinkerdModule } from "../linkerd/linkerd.module";
import { FeaturesService } from "./features.service";
import { FeaturesController } from "./features.controller";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Feature module that aggregates availability status for all optional
 * platform integrations (Kubernetes, cost, registry, Helm, Istio, Linkerd).
 */
@Module({
  imports: [
    ConfigModule,
    KubernetesModule,
    RegistryModule,
    IstioModule,
    LinkerdModule,
  ],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-features",
    version: "1.0.0",
    description:
      "Bulk feature availability endpoint for all optional platform integrations",
  };
}
