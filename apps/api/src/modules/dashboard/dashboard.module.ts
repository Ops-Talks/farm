import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardService } from "./dashboard.service";
import { WidgetService } from "./widget.service";
import { DashboardController } from "./dashboard.controller";
import { Dashboard } from "./entities/dashboard.entity";
import { DashboardWidget } from "./entities/dashboard-widget.entity";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Module for managing custom dashboards and their widgets.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Dashboard, DashboardWidget])],
  controllers: [DashboardController],
  providers: [DashboardService, WidgetService],
  exports: [DashboardService],
})
export class DashboardModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-dashboards",
    version: "1.0.0",
    description: "Custom dashboard builder with configurable widget grid",
  };
}
