import { Module } from "@nestjs/common";
import { DocumentationController } from "./documentation.controller";
import { DocumentationService } from "./documentation.service";

/**
 * Module for managing technical documentation associated with catalog components.
 */
@Module({
  controllers: [DocumentationController],
  providers: [DocumentationService],
  exports: [DocumentationService],
})
export class DocumentationModule {}
