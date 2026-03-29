import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SloService } from "./slo.service";
import { SloCalculatorService } from "./slo-calculator.service";
import { SloController } from "./slo.controller";
import { Slo } from "./entities/slo.entity";

/**
 * Module for managing Service Level Objectives and error budget calculations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Slo])],
  controllers: [SloController],
  providers: [SloService, SloCalculatorService],
  exports: [SloService],
})
export class SloModule {}
