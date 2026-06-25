import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScorecardResult } from "./entities/scorecard-result.entity";
import { ScorecardsService } from "./scorecards.service";
import { ScorecardEvaluatorService } from "./scorecard-evaluator.service";
import { ScorecardsController } from "./scorecards.controller";
import { ScorecardSchedulerService } from "./scorecard-scheduler.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { ApiSpec } from "../api-specs/entities/api-spec.entity";
import { ApiHealthCheck } from "../gateway/entities/api-health-check.entity";
import { Slo } from "../slo/entities/slo.entity";
import { Deployment } from "../environments/entities/deployment.entity";
import { ContainerVulnerability } from "../registry/entities/container-vulnerability.entity";
import { ResourceViolation } from "../tag-policy/entities/resource-violation.entity";
import { OpaResult } from "../opa/entities/opa-result.entity";
import { IacModule } from "../iac/entities/iac-module.entity";
import { IacStack } from "../iac/entities/iac-stack.entity";
import { FluxBinding } from "../kubernetes/entities/flux-binding.entity";
import { ActualCost } from "../finops/entities/actual-cost.entity";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Feature module for component scorecards.
 *
 * Registers all entity repositories required by ScorecardEvaluatorService
 * and exposes ScorecardsService and ScorecardEvaluatorService so that other
 * modules (e.g. CatalogModule, AnalyticsModule) can inject them.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScorecardResult,
      Component,
      Team,
      Documentation,
      ApiSpec,
      ApiHealthCheck,
      Slo,
      Deployment,
      ContainerVulnerability,
      ResourceViolation,
      OpaResult,
      IacModule,
      IacStack,
      FluxBinding,
      ActualCost,
    ]),
  ],
  controllers: [ScorecardsController],
  providers: [
    ScorecardsService,
    ScorecardEvaluatorService,
    ScorecardSchedulerService,
  ],
  exports: [ScorecardsService, ScorecardEvaluatorService],
})
export class ScorecardsModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-scorecards",
    version: "1.0.0",
    description:
      "Component scorecard evaluation, maturity levels, and criterion tracking",
  };
}
