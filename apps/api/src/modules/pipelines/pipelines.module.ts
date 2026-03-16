import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { PipelinesService } from "./pipelines.service";
import { PipelinesController } from "./pipelines.controller";
import { PipelineProcessor } from "./pipeline.processor";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";

/**
 * Feature module for pipeline definition management and BullMQ-based execution.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Pipeline, PipelineRun]),
    BullModule.registerQueue({ name: QUEUE_NAMES.PIPELINE_EXECUTION }),
  ],
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelineProcessor],
  exports: [PipelinesService],
})
export class PipelinesModule {}
