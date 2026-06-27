import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { PipelinesService } from "./pipelines.service";
import { PipelinesController } from "./pipelines.controller";
import { PipelineProcessor } from "./pipeline.processor";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";
import { HelmDeployExecutor } from "../helm/helm-deploy.executor";
import { BuildStageExecutor } from "./build-stage.executor";
import { InfracostStageExecutor } from "./infracost-stage.executor";
import { CloudModule } from "../cloud/cloud.module";
import { IntegrationCredential } from "../integrations/entities/integration-credential.entity";
import { Component } from "../catalog/entities/component.entity";
import { Deployment } from "../environments/entities/deployment.entity";
import { Environment } from "../environments/entities/environment.entity";
import { IntegrationsModule } from "../integrations/integrations.module";
import { EnvironmentsModule } from "../environments/environments.module";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

const isTest = process.env.NODE_ENV === "test";

/**
 * Feature module for pipeline definition management and BullMQ-based execution.
 * BullMQ queue registration is skipped in test environments to avoid requiring
 * a live Redis connection during e2e tests.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pipeline,
      PipelineRun,
      IntegrationCredential,
      Component,
      Deployment,
      Environment,
    ]),
    ...(isTest
      ? []
      : [BullModule.registerQueue({ name: QUEUE_NAMES.PIPELINE_EXECUTION })]),
    CloudModule,
    forwardRef(() => IntegrationsModule),
    EnvironmentsModule,
  ],
  controllers: [PipelinesController],
  providers: [
    PipelinesService,
    HelmDeployExecutor,
    BuildStageExecutor,
    InfracostStageExecutor,
    ...(isTest ? [] : [PipelineProcessor]),
  ],
  exports: [PipelinesService],
})
export class PipelinesModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-pipelines",
    version: "1.0.0",
    description: "Pipeline definition and execution",
  };
}
