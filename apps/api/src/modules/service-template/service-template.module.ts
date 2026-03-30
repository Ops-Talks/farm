import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServiceTemplateService } from "./service-template.service";
import { ScaffoldService } from "./scaffold.service";
import { ServiceTemplateController } from "./service-template.controller";
import { ServiceTemplate } from "./entities/service-template.entity";
import { ScaffoldRequest } from "./entities/scaffold-request.entity";

/**
 * Module for managing service templates and scaffold operations
 * as part of the developer self-service workflow (Phase 15).
 */
@Module({
  imports: [TypeOrmModule.forFeature([ServiceTemplate, ScaffoldRequest])],
  controllers: [ServiceTemplateController],
  providers: [ServiceTemplateService, ScaffoldService],
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
