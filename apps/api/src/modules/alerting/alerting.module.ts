import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertingService } from "./alerting.service";
import { AlertingController } from "./alerting.controller";
import { AlertingRule } from "./entities/alerting-rule.entity";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Module for managing PromQL-based alerting rules.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AlertingRule])],
  controllers: [AlertingController],
  providers: [AlertingService],
  exports: [AlertingService],
})
export class AlertingModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-alerting",
    version: "1.0.0",
    description: "Alerting rules management",
  };
}
