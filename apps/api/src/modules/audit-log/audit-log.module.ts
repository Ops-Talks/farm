import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogService } from "./audit-log.service";
import { AuditLogController } from "./audit-log.controller";
import { AuditLog } from "./entities/audit-log.entity";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-audit-log",
    version: "1.0.0",
    description: "Immutable audit log trail for system actions",
  };
}
