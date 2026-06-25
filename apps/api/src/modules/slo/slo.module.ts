import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SloService } from "./slo.service";
import { SloCalculatorService } from "./slo-calculator.service";
import { SloController } from "./slo.controller";
import { Slo } from "./entities/slo.entity";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Module for managing Service Level Objectives and error budget calculations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Slo])],
  controllers: [SloController],
  providers: [SloService, SloCalculatorService],
  exports: [SloService],
})
export class SloModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-slo",
    version: "1.0.0",
    description:
      "SLO management, error budget calculation, and burn rate monitoring",
  };
}
