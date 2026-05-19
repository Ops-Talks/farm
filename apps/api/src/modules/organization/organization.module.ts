import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { OrganizationService } from "./organization.service";
import { OrganizationController } from "./organization.controller";
import { InvitationsController } from "./invitations.controller";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";
import { Organization } from "./entities/organization.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { User } from "../auth/entities/user.entity";
import { OrgInvitation } from "./entities/org-invitation.entity";
import { InvitationToken } from "./entities/invitation-token.entity";
import { OrgRolesGuard } from "../../common/guards/org-roles.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

const isTest = process.env.NODE_ENV === "test";

/**
 * Module for managing organizations and multi-tenant data isolation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      UserOrganization,
      User,
      OrgInvitation,
      InvitationToken,
    ]),
    AuditLogModule,
    ...(isTest
      ? []
      : [BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS })]),
  ],
  controllers: [
    OrganizationController,
    InvitationsController,
    InvitationController,
  ],
  providers: [
    OrganizationService,
    InvitationService,
    OrgRolesGuard,
    PermissionGuard,
  ],
  exports: [
    OrganizationService,
    InvitationService,
    OrgRolesGuard,
    PermissionGuard,
    TypeOrmModule,
  ],
})
export class OrganizationModule {}
