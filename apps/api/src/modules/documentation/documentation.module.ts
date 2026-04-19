import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { DocumentationController } from "./documentation.controller";
import { DocumentationService } from "./documentation.service";
import { DocumentationBuildService } from "./documentation-build.service";
import { Documentation } from "./entities/documentation.entity";
import { DocumentationBuild } from "./entities/documentation-build.entity";
import { DocsWebhookController } from "./docs-webhook.controller";
import { DocsBuildProcessor } from "./docs-build.processor";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

const isTest = process.env.NODE_ENV === "test";

/**
 * Module for managing technical documentation associated with catalog components.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Documentation, DocumentationBuild]),
    ...(isTest
      ? []
      : [BullModule.registerQueue({ name: QUEUE_NAMES.DOCS_BUILD })]),
  ],
  controllers: [
    DocumentationController,
    ...(isTest ? [] : [DocsWebhookController]),
  ],
  providers: [
    DocumentationService,
    DocumentationBuildService,
    ...(isTest ? [] : [DocsBuildProcessor]),
  ],
  exports: [DocumentationService, DocumentationBuildService],
})
export class DocumentationModule {}
