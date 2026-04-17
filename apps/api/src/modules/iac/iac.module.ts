import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IacService } from "./iac.service";
import { IacController } from "./iac.controller";
import { IacResourceService } from "./iac-resource.service";
import { IacModuleService } from "./iac-module.service";
import { IacModuleSyncService } from "./iac-module-sync.service";
import { IacModuleController } from "./iac-module.controller";
import { IacStack } from "./entities/iac-stack.entity";
import { IacRun } from "./entities/iac-run.entity";
import { IacModuleDrift } from "./entities/iac-module-drift.entity";
import { IacModule as IacModuleEntity } from "./entities/iac-module.entity";
import { IacModuleVersion } from "./entities/iac-module-version.entity";
import { IacResource } from "./entities/iac-resource.entity";
import { IacResourceDependency } from "./entities/iac-resource-dependency.entity";

/**
 * Feature module for IaC visibility:
 * - Stack management, run ingestion, and module drift tracking (FARM-E70)
 * - IaC Module Catalog with metadata sync (FARM-E68)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      IacStack,
      IacRun,
      IacModuleDrift,
      IacModuleEntity,
      IacModuleVersion,
      IacResource,
      IacResourceDependency,
    ]),
  ],
  controllers: [IacController, IacModuleController],
  providers: [
    IacService,
    IacResourceService,
    IacModuleService,
    IacModuleSyncService,
  ],
  exports: [IacService, IacResourceService, IacModuleService],
})
export class IacModule {}
