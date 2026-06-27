import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { TagPolicy } from "./entities/tag-policy.entity";
import { ResourceViolation } from "./entities/resource-violation.entity";
import { TagPolicyService } from "./tag-policy.service";
import { TagPolicyController } from "./tag-policy.controller";
import { ComplianceAuditService } from "./compliance-audit.service";
import { ComplianceAuditProcessor } from "./compliance-audit.processor";
import { KyvernoExportService } from "./kyverno-export.service";
import { CloudModule } from "../cloud/cloud.module";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

const isTest = process.env.NODE_ENV === "test";

/**
 * Feature module for resource tagging governance.
 *
 * Provides:
 * - Tag policy CRUD (TagPolicyService + TagPolicyController)
 * - Resource violation tracking
 * - Automated compliance auditing via BullMQ (ComplianceAuditProcessor)
 * - Cron-driven scheduled audits (ComplianceAuditService)
 * - Kyverno ClusterPolicy YAML export (KyvernoExportService)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TagPolicy, ResourceViolation]),
    ScheduleModule.forRoot(),
    ...(isTest
      ? []
      : [
          BullModule.registerQueue({ name: QUEUE_NAMES.COMPLIANCE_AUDIT }),
          CloudModule,
        ]),
  ],
  controllers: [TagPolicyController],
  providers: [
    TagPolicyService,
    ComplianceAuditService,
    KyvernoExportService,
    ...(isTest ? [] : [ComplianceAuditProcessor]),
  ],
  exports: [TagPolicyService],
})
export class TagPolicyModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-tag-governance",
    version: "1.0.0",
    description:
      "Resource tagging governance, compliance audit, and violation tracking",
  };
}
