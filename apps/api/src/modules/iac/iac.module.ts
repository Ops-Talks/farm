import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IacService } from "./iac.service";
import { IacController } from "./iac.controller";
import { IacStack } from "./entities/iac-stack.entity";
import { IacRun } from "./entities/iac-run.entity";
import { IacModuleDrift } from "./entities/iac-module-drift.entity";

/**
 * Feature module for IaC stack management, run ingestion, and module drift
 * tracking.
 * Provides ingest endpoints consumed by Cultivator and Agronomist, plus
 * user-facing dashboard and run history endpoints.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IacStack, IacRun, IacModuleDrift])],
  controllers: [IacController],
  providers: [IacService],
  exports: [IacService],
})
export class IacModule {}
