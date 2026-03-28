import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { OrganizationService } from "./organization.service";
import { OrganizationController } from "./organization.controller";
import { InvitationsController } from "./invitations.controller";
import { Organization } from "./entities/organization.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { User } from "../auth/entities/user.entity";
import { OrgInvitation } from "./entities/org-invitation.entity";
import { OrgRolesGuard } from "../../common/guards/org-roles.guard";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

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
    ]),
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
  ],
  controllers: [OrganizationController, InvitationsController],
  providers: [OrganizationService, OrgRolesGuard],
  exports: [OrganizationService, OrgRolesGuard, TypeOrmModule],
})
export class OrganizationModule {}
