import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { PipelinesService } from "./pipelines.service";
import { PipelinesController } from "./pipelines.controller";
import { PipelineProcessor } from "./pipeline.processor";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";
import { HelmDeployExecutor } from "../helm/helm-deploy.executor";

const isTest = process.env.NODE_ENV === "test";

/**
 * Feature module for pipeline definition management and BullMQ-based execution.
 * BullMQ queue registration is skipped in test environments to avoid requiring
 * a live Redis connection during e2e tests.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Pipeline, PipelineRun]),
    ...(isTest
      ? []
      : [BullModule.registerQueue({ name: QUEUE_NAMES.PIPELINE_EXECUTION })]),
  ],
  controllers: [PipelinesController],
  providers: [
    PipelinesService,
    HelmDeployExecutor,
    ...(isTest ? [] : [PipelineProcessor]),
  ],
  exports: [PipelinesService],
})
export class PipelinesModule {}
