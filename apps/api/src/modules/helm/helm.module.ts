import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KubernetesModule } from "../kubernetes/kubernetes.module";
import { Deployment } from "../environments/entities/deployment.entity";
import { Component } from "../catalog/entities/component.entity";
import { Environment } from "../environments/entities/environment.entity";
import { HelmService } from "./helm.service";
import { HelmController } from "./helm.controller";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Feature module for Helm chart integration.
 * Provides Helm release discovery from Kubernetes Secrets and
 * synchronization of releases as Farm Deployment records.
 */
@Module({
  imports: [
    KubernetesModule,
    TypeOrmModule.forFeature([Deployment, Component, Environment]),
  ],
  controllers: [HelmController],
  providers: [HelmService],
  exports: [HelmService],
})
export class HelmModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-helm",
    version: "1.0.0",
    description: "Helm chart integration and release discovery",
  };
}
