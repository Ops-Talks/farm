import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KubernetesModule } from "../kubernetes/kubernetes.module";
import { RegistryModule } from "../registry/registry.module";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { IntegrationCredential } from "../integrations/entities/integration-credential.entity";
import { Organization } from "../organization/entities/organization.entity";
import { SetupService } from "./setup.service";
import { SetupController } from "./setup.controller";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Feature module providing the admin setup checklist.
 * Checks real-time completion of key onboarding steps and
 * allows dismissing individual items per organization.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Component,
      Team,
      IntegrationCredential,
      Organization,
    ]),
    KubernetesModule,
    RegistryModule,
  ],
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-setup",
    version: "1.0.0",
    description:
      "Admin setup checklist with real-time completion status and dismissal support",
  };
}
