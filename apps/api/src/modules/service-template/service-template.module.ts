import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServiceTemplateService } from "./service-template.service";
import { ScaffoldService } from "./scaffold.service";
import { ServiceTemplateController } from "./service-template.controller";
import { TemplateEngineService } from "./template-engine.service";
import { ServiceTemplate } from "./entities/service-template.entity";
import { ScaffoldRequest } from "./entities/scaffold-request.entity";
import { DatabaseModule } from "../../common/database/database.module";

/**
 * Module for managing service templates and scaffold operations
 * as part of the developer self-service workflow (Phase 15).
 * Extended in Phase 28 (Software Templates 2.0) with Nunjucks rendering,
 * dry-run validation, and live preview endpoints.
 *
 * DatabaseModule is imported to ensure MigrationLockService.onModuleInit()
 * completes (migrations run) before this module's onModuleInit seed hook
 * queries the service_templates table.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceTemplate, ScaffoldRequest]),
    DatabaseModule,
  ],
  controllers: [ServiceTemplateController],
  providers: [ServiceTemplateService, ScaffoldService, TemplateEngineService],
  exports: [ServiceTemplateService],
})
export class ServiceTemplateModule implements OnModuleInit {
  private readonly logger = new Logger(ServiceTemplateModule.name);

  constructor(
    private readonly serviceTemplateService: ServiceTemplateService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing ServiceTemplateModule...");
    await this.serviceTemplateService.seedBuiltInTemplates();
  }
}
