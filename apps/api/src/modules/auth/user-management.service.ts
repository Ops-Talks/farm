import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Like, Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as bcrypt from "bcrypt";
import { OrgRole } from "@farm/types";
import { User } from "./entities/user.entity";
import { PasswordReset } from "./entities/password-reset.entity";
import { Organization } from "../organization/entities/organization.entity";
import { UserOrganization } from "../organization/entities/user-organization.entity";
import { AuditLogService } from "../audit-log/audit-log.service";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { NotificationJobData } from "../../common/queues/notification.processor";
import { AdminCreateUserDto } from "./dto/admin-create-user.dto";

const TEMP_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

export interface OrgMembershipSummary {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: OrgRole;
}

export interface ManagedUserView {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  suspended: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  orgMemberships: OrgMembershipSummary[];
}

export interface UserListResult {
  users: ManagedUserView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListUsersOptions {
  orgId?: string;
  search?: string;
  role?: OrgRole;
  page?: number;
  pageSize?: number;
}

export interface AuthenticatedActor {
  userId: string;
  username: string;
  roles: string[];
}

/**
 * Phase 37 user management service. Provides org-scoped and platform-wide
 * listing, role updates, suspension, password reset, and deletion.
 */
@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly configService: ConfigService,
    @Optional() private readonly auditLog?: AuditLogService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue?: Queue<NotificationJobData>,
  ) {}

  // ---------------------------------------------------------------------------
  // Permission helpers
  // ---------------------------------------------------------------------------

  isPlatformAdmin(actor: AuthenticatedActor): boolean {
    return actor.roles?.includes("admin") ?? false;
  }

  /**
   * Returns the org ids in which the actor holds at least the ADMIN role.
   */
  async getAdminOrgIds(actor: AuthenticatedActor): Promise<string[]> {
    const memberships = await this.userOrganizationRepository.find({
      where: { userId: actor.userId },
    });
    return memberships
      .filter((m) => m.role === OrgRole.ADMIN || m.role === OrgRole.OWNER)
      .map((m) => m.organizationId);
  }

  private async assertOrgAdmin(
    actor: AuthenticatedActor,
    orgId: string,
  ): Promise<UserOrganization> {
    const membership = await this.userOrganizationRepository.findOne({
      where: { userId: actor.userId, organizationId: orgId },
    });
    if (
      !membership ||
      (membership.role !== OrgRole.ADMIN && membership.role !== OrgRole.OWNER)
    ) {
      if (!this.isPlatformAdmin(actor)) {
        throw new ForbiddenException(
          "You must be ADMIN or OWNER of this organization",
        );
      }
    }
    return membership!;
  }

  // ---------------------------------------------------------------------------
  // Listing & retrieval
  // ---------------------------------------------------------------------------

  async listUsers(
    actor: AuthenticatedActor,
    options: ListUsersOptions = {},
  ): Promise<UserListResult> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));

    const isPlatformAdmin = this.isPlatformAdmin(actor);
    const adminOrgIds = await this.getAdminOrgIds(actor);

    if (!isPlatformAdmin && adminOrgIds.length === 0) {
      throw new ForbiddenException("You do not have permission to list users");
    }

    let userIds: string[] | null = null;
    if (options.orgId) {
      if (!isPlatformAdmin && !adminOrgIds.includes(options.orgId)) {
        throw new ForbiddenException(
          "You must be ADMIN of the requested organization",
        );
      }
      const memberships = await this.userOrganizationRepository.find({
        where: { organizationId: options.orgId },
      });
      userIds = memberships.map((m) => m.userId);
    } else if (!isPlatformAdmin) {
      const memberships = await this.userOrganizationRepository.find({
        where: { organizationId: In(adminOrgIds) },
      });
      userIds = Array.from(new Set(memberships.map((m) => m.userId)));
    }

    const where: Record<string, unknown>[] = [];
    if (options.search) {
      where.push(
        { username: Like(`%${options.search}%`) },
        { email: Like(`%${options.search}%`) },
        { displayName: Like(`%${options.search}%`) },
      );
    }

    const baseWhere = userIds ? { id: In(userIds) } : {};
    const finalWhere =
      where.length > 0 ? where.map((w) => ({ ...baseWhere, ...w })) : baseWhere;

    if (userIds && userIds.length === 0) {
      return { users: [], total: 0, page, pageSize };
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: finalWhere,
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: "DESC" },
    });

    let filtered = users;
    if (options.role) {
      const memberships = await this.userOrganizationRepository.find({
        where: { userId: In(users.map((u) => u.id)), role: options.role },
      });
      const matching = new Set(memberships.map((m) => m.userId));
      filtered = users.filter((u) => matching.has(u.id));
    }

    const views = await Promise.all(
      filtered.map((u) => this.toView(u, isPlatformAdmin ? null : adminOrgIds)),
    );
    return { users: views, total, page, pageSize };
  }

  async getUser(
    actor: AuthenticatedActor,
    id: string,
  ): Promise<ManagedUserView> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    const isPlatformAdmin = this.isPlatformAdmin(actor);
    const adminOrgIds = isPlatformAdmin
      ? null
      : await this.getAdminOrgIds(actor);

    if (!isPlatformAdmin) {
      if (!adminOrgIds || adminOrgIds.length === 0) {
        throw new ForbiddenException("Insufficient permissions");
      }
      const userMemberships = await this.userOrganizationRepository.find({
        where: { userId: id },
      });
      const overlap = userMemberships.some((m) =>
        adminOrgIds.includes(m.organizationId),
      );
      if (!overlap) {
        throw new ForbiddenException("Insufficient permissions");
      }
    }

    return this.toView(user, adminOrgIds);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  async updateRole(
    actor: AuthenticatedActor,
    targetUserId: string,
    orgId: string,
    role: OrgRole,
  ): Promise<UserOrganization> {
    await this.assertOrgAdmin(actor, orgId);

    const membership = await this.userOrganizationRepository.findOne({
      where: { userId: targetUserId, organizationId: orgId },
    });
    if (!membership) {
      throw new NotFoundException(
        "User is not a member of the given organization",
      );
    }

    // Block requester from demoting themselves if they are the last OWNER
    if (
      actor.userId === targetUserId &&
      membership.role === OrgRole.OWNER &&
      role !== OrgRole.OWNER
    ) {
      const owners = await this.userOrganizationRepository.count({
        where: { organizationId: orgId, role: OrgRole.OWNER },
      });
      if (owners <= 1) {
        throw new BadRequestException(
          "Cannot demote the last OWNER of the organization",
        );
      }
    }

    const previousRole = membership.role;
    membership.role = role;
    const saved = await this.userOrganizationRepository.save(membership);

    void this.auditLog
      ?.log({
        action: "USER_ROLE_CHANGED",
        resourceType: "User",
        resourceId: targetUserId,
        actorId: actor.userId,
        actorUsername: actor.username,
        organizationId: orgId,
        payload: { from: previousRole, to: role, orgId },
      })
      .catch(() => undefined);

    return saved;
  }

  async setSuspended(
    actor: AuthenticatedActor,
    targetUserId: string,
    suspended: boolean,
  ): Promise<User> {
    if (!this.isPlatformAdmin(actor)) {
      throw new ForbiddenException("Platform admin role required");
    }
    if (actor.userId === targetUserId) {
      throw new BadRequestException("You cannot suspend your own account");
    }
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException("User not found");

    user.suspended = suspended;
    if (suspended) {
      user.refreshToken = null;
    }
    const saved = await this.userRepository.save(user);
    void this.auditLog
      ?.log({
        action: suspended ? "USER_SUSPENDED" : "USER_ACTIVATED",
        resourceType: "User",
        resourceId: targetUserId,
        actorId: actor.userId,
        actorUsername: actor.username,
        payload: { suspended },
      })
      .catch(() => undefined);
    return saved;
  }

  async resetPassword(
    actor: AuthenticatedActor,
    targetUserId: string,
  ): Promise<{
    tempPasswordExpiresAt: Date;
    tempPassword?: string;
    fallback?: boolean;
  }> {
    if (!this.isPlatformAdmin(actor)) {
      throw new ForbiddenException("Platform admin role required");
    }
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException("User not found");

    const tempPassword = randomBytes(9).toString("base64").slice(0, 12);
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS);

    const reset = this.passwordResetRepository.create({
      userId: targetUserId,
      tempPasswordHash,
      expiresAt,
    });
    await this.passwordResetRepository.save(reset);

    // Persist hash to user.password directly so the temp password works for login.
    await this.userRepository.update(
      { id: targetUserId },
      { password: tempPasswordHash, refreshToken: null },
    );

    const smtpEnabled =
      !!this.configService.get<string>("smtp.host") &&
      !!this.notificationsQueue;

    const appUrl =
      this.configService.get<string>("app.url") ?? "http://localhost:3001";
    const loginLink = `${appUrl}/login`;

    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add("send-password-reset-email", {
          type: "email",
          recipient: user.email,
          subject: "Your Farm password has been reset",
          template: "password-reset",
          payload: {
            username: user.username,
            tempPassword,
            loginLink,
            expiresAt: expiresAt.toISOString(),
          },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue password reset email: ${(err as Error).message}`,
        );
      }
    }

    void this.auditLog
      ?.log({
        action: "USER_PASSWORD_RESET",
        resourceType: "User",
        resourceId: targetUserId,
        actorId: actor.userId,
        actorUsername: actor.username,
        payload: { expiresAt: expiresAt.toISOString() },
      })
      .catch(() => undefined);

    if (!smtpEnabled) {
      return {
        tempPasswordExpiresAt: expiresAt,
        tempPassword,
        fallback: true,
      };
    }
    return { tempPasswordExpiresAt: expiresAt };
  }

  async createUser(
    actor: AuthenticatedActor,
    dto: AdminCreateUserDto,
  ): Promise<ManagedUserView & { tempPassword?: string }> {
    // 1. Authorization
    if (dto.orgId) {
      if (!this.isPlatformAdmin(actor)) {
        await this.assertOrgAdmin(actor, dto.orgId);
      }
    } else if (!this.isPlatformAdmin(actor)) {
      throw new ForbiddenException("Platform admin role required");
    }
    if (dto.platformAdmin && !this.isPlatformAdmin(actor)) {
      throw new ForbiddenException(
        "Only platform admins can grant the platform admin role",
      );
    }

    // 2. Pre-validate uniqueness — consistent with auth.service register() pattern
    const existing = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException("Username or email already taken");
    }

    // 3. If orgId provided, verify the org exists before creating the user
    if (dto.orgId) {
      const org = await this.organizationRepository.findOne({
        where: { id: dto.orgId },
      });
      if (!org) {
        throw new NotFoundException("Organization not found");
      }
    }

    // 4. Credentials — pre-hash so @BeforeInsert skips (guard: !startsWith("$2b$"))
    let tempPassword: string | undefined;
    const rawPassword =
      dto.password ?? randomBytes(9).toString("base64").slice(0, 12);
    if (!dto.password) {
      tempPassword = rawPassword;
    }
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 5. Persist user
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      displayName: dto.displayName,
      password: hashedPassword,
      roles: dto.platformAdmin ? ["user", "admin"] : ["user"],
    });
    await this.userRepository.save(user);

    // 6. Org enrollment
    if (dto.orgId) {
      const membership = this.userOrganizationRepository.create({
        userId: user.id,
        organizationId: dto.orgId,
        role: dto.orgRole ?? OrgRole.VIEWER,
      });
      await this.userOrganizationRepository.save(membership);
    }

    // 7. Welcome email — only attempt when both SMTP and queue are configured
    const smtpConfigured = !!this.configService.get<string>("smtp.host");
    let emailDelivered = false;
    if (this.notificationsQueue && smtpConfigured) {
      const appUrl =
        this.configService.get<string>("app.url") ?? "http://localhost:3001";
      try {
        await this.notificationsQueue.add("send-welcome-email", {
          type: "email",
          recipient: user.email,
          subject: "Welcome to Farm",
          template: "welcome",
          payload: {
            username: user.username,
            email: user.email,
            tempPassword,
            loginLink: `${appUrl}/login`,
          },
        });
        emailDelivered = true;
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue welcome email: ${(err as Error).message}`,
        );
      }
    }

    // 8. Audit log
    void this.auditLog
      ?.log({
        action: "USER_CREATED",
        resourceType: "User",
        resourceId: user.id,
        actorId: actor.userId,
        actorUsername: actor.username,
        ...(dto.orgId ? { organizationId: dto.orgId } : {}),
        payload: {
          orgId: dto.orgId ?? null,
          platformAdmin: dto.platformAdmin ?? false,
        },
      })
      .catch(() => undefined);

    // 9. Return view — expose tempPassword only when email was not delivered
    const view = await this.toView(user, null);
    if (tempPassword && !emailDelivered) {
      return { ...view, tempPassword };
    }
    return view;
  }

  async deleteUser(
    actor: AuthenticatedActor,
    targetUserId: string,
    orgId?: string,
  ): Promise<void> {
    if (actor.userId === targetUserId) {
      throw new BadRequestException("You cannot delete your own account");
    }
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException("User not found");

    if (orgId) {
      await this.assertOrgAdmin(actor, orgId);
      const membership = await this.userOrganizationRepository.findOne({
        where: { userId: targetUserId, organizationId: orgId },
      });
      if (!membership) {
        throw new NotFoundException("Membership not found");
      }
      if (membership.role === OrgRole.OWNER) {
        const owners = await this.userOrganizationRepository.count({
          where: { organizationId: orgId, role: OrgRole.OWNER },
        });
        if (owners <= 1) {
          throw new BadRequestException(
            "Cannot remove the last OWNER of the organization",
          );
        }
      }
      await this.userOrganizationRepository.delete({ id: membership.id });
    } else {
      if (!this.isPlatformAdmin(actor)) {
        throw new ForbiddenException("Platform admin role required");
      }
      const ownerships = await this.userOrganizationRepository.find({
        where: { userId: targetUserId, role: OrgRole.OWNER },
      });
      for (const ownership of ownerships) {
        const owners = await this.userOrganizationRepository.count({
          where: {
            organizationId: ownership.organizationId,
            role: OrgRole.OWNER,
          },
        });
        if (owners <= 1) {
          throw new BadRequestException(
            `Cannot delete user: they are the last OWNER of organization ${ownership.organizationId}`,
          );
        }
      }
      await this.userOrganizationRepository.delete({ userId: targetUserId });
      await this.userRepository.delete({ id: targetUserId });
    }

    void this.auditLog
      ?.log({
        action: "USER_DELETED",
        resourceType: "User",
        resourceId: targetUserId,
        actorId: actor.userId,
        actorUsername: actor.username,
        ...(orgId ? { organizationId: orgId } : {}),
        payload: { orgId: orgId ?? null },
      })
      .catch(() => undefined);
  }

  // ---------------------------------------------------------------------------
  // View helpers
  // ---------------------------------------------------------------------------

  private async toView(
    user: User,
    visibleOrgIds: string[] | null,
  ): Promise<ManagedUserView> {
    const memberships = await this.userOrganizationRepository.find({
      where: { userId: user.id },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const orgs = orgIds.length
      ? await this.organizationRepository.find({ where: { id: In(orgIds) } })
      : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    const orgMemberships: OrgMembershipSummary[] = memberships
      .filter(
        (m) =>
          visibleOrgIds === null || visibleOrgIds.includes(m.organizationId),
      )
      .map((m) => ({
        orgId: m.organizationId,
        orgSlug: orgMap.get(m.organizationId)?.slug ?? "",
        orgName: orgMap.get(m.organizationId)?.name ?? "",
        role: m.role,
      }));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles ?? [],
      suspended: user.suspended ?? false,
      lastLogin: user.lastLogin ?? null,
      createdAt: user.createdAt,
      orgMemberships,
    };
  }
}
