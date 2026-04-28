import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomBytes } from "crypto";
import { OrgRole } from "@farm/types";
import { InvitationToken } from "./entities/invitation-token.entity";
import { Organization } from "./entities/organization.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { User } from "../auth/entities/user.entity";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { NotificationJobData } from "../../common/queues/notification.processor";
import { AuditLogService } from "../audit-log/audit-log.service";

/**
 * Public preview returned for unauthenticated invitation lookups.
 */
export interface InvitationPreview {
  orgName: string;
  role: OrgRole;
  invitedByName: string;
  expiresAt: Date;
  message: string | null;
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Service responsible for token-based organization invitations
 * (Phase 37 — FARM-T410..T413).
 */
@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    @InjectRepository(InvitationToken)
    private readonly invitationRepository: Repository<InvitationToken>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Optional() private readonly auditLog?: AuditLogService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue?: Queue<NotificationJobData>,
  ) {}

  /**
   * Creates a batch of invitation tokens, one per email, and enqueues an
   * email notification for each.
   */
  async createInvitations(
    invitedBy: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationToken[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    const inviter = await this.userRepository.findOne({
      where: { id: invitedBy },
    });
    const inviterName = inviter?.displayName || inviter?.username || "An admin";

    const created: InvitationToken[] = [];
    for (const rawEmail of dto.emails) {
      const email = rawEmail.toLowerCase();
      const token = randomBytes(32).toString("hex");
      const now = new Date();
      const entity = this.invitationRepository.create({
        token,
        type: "org-invite",
        email,
        orgId: dto.organizationId,
        invitedBy,
        role: dto.role,
        message: dto.message ?? null,
        status: "pending",
        expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
      });
      const saved = await this.invitationRepository.save(entity);
      created.push(saved);

      await this.enqueueInvitationEmail(saved, organization.name, inviterName);

      void this.auditLog
        ?.log({
          action: "INVITATION_SENT",
          resourceType: "InvitationToken",
          resourceId: saved.id,
          actorId: invitedBy,
          actorUsername: inviter?.username || "system",
          organizationId: dto.organizationId,
          payload: { email, role: dto.role },
        })
        .catch((err) =>
          this.logger.warn(`Audit log failed: ${(err as Error).message}`),
        );
    }
    return created;
  }

  /**
   * Returns a sanitized preview of an invitation for the public preview page.
   */
  async getPreview(token: string): Promise<InvitationPreview> {
    const invitation = await this.requirePending(token);
    const org = await this.organizationRepository.findOne({
      where: { id: invitation.orgId },
    });
    const inviter = await this.userRepository.findOne({
      where: { id: invitation.invitedBy },
    });
    return {
      orgName: org?.name ?? "Unknown organization",
      role: invitation.role,
      invitedByName: inviter?.displayName || inviter?.username || "An admin",
      expiresAt: invitation.expiresAt,
      message: invitation.message,
    };
  }

  /**
   * Accepts an invitation by token. Requires that a user account already
   * exists for the invited email. Creates the org membership idempotently.
   */
  async acceptInvitation(
    token: string,
    currentUserId?: string,
  ): Promise<{ organizationId: string; role: OrgRole; userId: string }> {
    const invitation = await this.requirePending(token);

    const user = await this.userRepository.findOne({
      where: { email: invitation.email },
    });
    if (!user) {
      throw new NotFoundException(
        "No account found for the invited email. Please register first.",
      );
    }

    if (currentUserId && currentUserId !== user.id) {
      throw new ForbiddenException(
        "Invitation email does not match the authenticated user",
      );
    }

    const existing = await this.userOrganizationRepository.findOne({
      where: { userId: user.id, organizationId: invitation.orgId },
    });
    if (!existing) {
      const membership = this.userOrganizationRepository.create({
        userId: user.id,
        organizationId: invitation.orgId,
        role: invitation.role,
      });
      await this.userOrganizationRepository.save(membership);
    }

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = user.id;
    await this.invitationRepository.save(invitation);

    void this.auditLog
      ?.log({
        action: "INVITATION_ACCEPTED",
        resourceType: "InvitationToken",
        resourceId: invitation.id,
        actorId: user.id,
        actorUsername: user.username,
        organizationId: invitation.orgId,
        payload: { email: invitation.email, role: invitation.role },
      })
      .catch(() => undefined);

    return {
      organizationId: invitation.orgId,
      role: invitation.role,
      userId: user.id,
    };
  }

  /**
   * Lists invitations for an organization with optional status filter.
   */
  async listInvitations(
    orgId: string,
    status?: "pending" | "accepted" | "revoked",
  ): Promise<InvitationToken[]> {
    return this.invitationRepository.find({
      where: { orgId, ...(status ? { status } : {}) },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Re-enqueues the invitation email. Only works for pending invitations.
   */
  async resendInvitation(
    id: string,
    requesterId: string,
  ): Promise<InvitationToken> {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    await this.assertCanManage(invitation.orgId, requesterId);
    if (invitation.status !== "pending") {
      throw new BadRequestException("Only pending invitations can be resent");
    }
    const org = await this.organizationRepository.findOne({
      where: { id: invitation.orgId },
    });
    const inviter = await this.userRepository.findOne({
      where: { id: invitation.invitedBy },
    });
    await this.enqueueInvitationEmail(
      invitation,
      org?.name ?? "your organization",
      inviter?.displayName || inviter?.username || "An admin",
    );
    return invitation;
  }

  /**
   * Marks an invitation as revoked. Only valid for pending invitations.
   */
  async revokeInvitation(
    id: string,
    requesterId: string,
  ): Promise<InvitationToken> {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    await this.assertCanManage(invitation.orgId, requesterId);
    if (invitation.status !== "pending") {
      throw new BadRequestException("Only pending invitations can be revoked");
    }
    invitation.status = "revoked";
    await this.invitationRepository.save(invitation);

    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
    });
    void this.auditLog
      ?.log({
        action: "INVITATION_REVOKED",
        resourceType: "InvitationToken",
        resourceId: invitation.id,
        actorId: requesterId,
        actorUsername: requester?.username || "system",
        organizationId: invitation.orgId,
        payload: { email: invitation.email },
      })
      .catch(() => undefined);

    return invitation;
  }

  /**
   * Periodic cleanup of expired pending invitations.
   * Runs every 6 hours.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupExpired(): Promise<number> {
    const result = await this.invitationRepository.delete({
      status: "pending",
      expiresAt: LessThan(new Date()),
    });
    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Cleaned up ${affected} expired invitation token(s)`);
    }
    return affected;
  }

  private async requirePending(token: string): Promise<InvitationToken> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
    });
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }
    if (invitation.status === "revoked") {
      throw new BadRequestException("Invitation has been revoked");
    }
    if (invitation.status === "accepted") {
      throw new BadRequestException("Invitation has already been accepted");
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Invitation has expired");
    }
    return invitation;
  }

  private async assertCanManage(
    orgId: string,
    requesterId: string,
  ): Promise<void> {
    const membership = await this.userOrganizationRepository.findOne({
      where: { userId: requesterId, organizationId: orgId },
    });
    if (
      !membership ||
      (membership.role !== OrgRole.ADMIN && membership.role !== OrgRole.OWNER)
    ) {
      throw new ForbiddenException(
        "You must be ADMIN or OWNER of this organization",
      );
    }
  }

  private async enqueueInvitationEmail(
    invitation: InvitationToken,
    orgName: string,
    inviterName: string,
  ): Promise<void> {
    const appUrl =
      this.configService.get<string>("app.url") ?? "http://localhost:3001";
    const acceptUrl = `${appUrl}/invitations/accept?token=${invitation.token}`;
    if (!this.notificationsQueue) {
      this.logger.debug(
        `Notifications queue not available; skipping email for invitation ${invitation.id}`,
      );
      return;
    }
    try {
      await this.notificationsQueue.add("send-invitation-email", {
        type: "email",
        recipient: invitation.email,
        subject: `You're invited to join ${orgName} on Farm`,
        template: "org-invitation",
        payload: {
          orgName,
          inviterName,
          role: invitation.role,
          acceptUrl,
          message: invitation.message,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue invitation email: ${(err as Error).message}`,
      );
    }
  }
}
