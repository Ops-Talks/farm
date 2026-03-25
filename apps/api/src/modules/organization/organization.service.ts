import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "./entities/organization.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { User } from "../auth/entities/user.entity";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { MemberResponseDto } from "./dto/member-response.dto";
import { OrgRole } from "@farm/types";

/**
 * Service responsible for managing organizations and organization membership.
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Derives a URL-friendly slug from an organization name.
   * @param name - The organization name
   * @returns A lowercase hyphenated slug
   */
  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }

  /**
   * Creates a new organization and assigns the creator as owner.
   * @param createOrganizationDto - The organization data
   * @param ownerId - The UUID of the user creating the organization
   * @returns The newly created organization
   * @throws ConflictException if an organization with the same name or slug already exists
   */
  async create(
    createOrganizationDto: CreateOrganizationDto,
    ownerId: string,
  ): Promise<Organization> {
    const slug = this.toSlug(createOrganizationDto.name);

    const existing = await this.organizationRepository.findOne({
      where: [{ name: createOrganizationDto.name }, { slug }],
    });
    if (existing) {
      throw new ConflictException(
        `Organization with name "${createOrganizationDto.name}" already exists`,
      );
    }

    const organization = this.organizationRepository.create({
      ...createOrganizationDto,
      slug,
      ownerId,
    });

    const saved = await this.organizationRepository.save(organization);

    // Add the creator as owner in the join table
    const membership = this.userOrganizationRepository.create({
      userId: ownerId,
      organizationId: saved.id,
      role: OrgRole.OWNER,
    });
    await this.userOrganizationRepository.save(membership);

    this.logger.log(`Created organization: ${saved.name} (owner: ${ownerId})`);
    return saved;
  }

  /**
   * Retrieves all organizations with pagination.
   * @param skip - Number of records to skip
   * @param take - Number of records to return
   * @returns A tuple of [organizations, total count]
   */
  async findAll(skip = 0, take = 20): Promise<[Organization[], number]> {
    return this.organizationRepository.findAndCount({
      order: { name: "ASC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single organization by its unique identifier.
   * @param id - The UUID of the organization
   * @returns The organization with the specified ID
   * @throws NotFoundException if no organization with the given ID exists
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }
    return organization;
  }

  /**
   * Updates an existing organization.
   * @param id - The UUID of the organization to update
   * @param updateOrganizationDto - Fields to update
   * @param requesterId - The UUID of the user making the request
   * @returns The updated organization
   * @throws NotFoundException if no organization with the given ID exists
   * @throws ConflictException if the new name conflicts with an existing organization
   */
  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    requesterId: string,
  ): Promise<Organization> {
    const organization = await this.findOne(id);

    await this.assertOrgRole(id, requesterId, OrgRole.ADMIN);

    if (
      updateOrganizationDto.name &&
      updateOrganizationDto.name !== organization.name
    ) {
      const newSlug = this.toSlug(updateOrganizationDto.name);
      const existing = await this.organizationRepository.findOne({
        where: [{ name: updateOrganizationDto.name }, { slug: newSlug }],
      });
      if (existing) {
        throw new ConflictException(
          `Organization with name "${updateOrganizationDto.name}" already exists`,
        );
      }
      (updateOrganizationDto as Organization).slug = newSlug;
    }

    const updated = this.organizationRepository.merge(
      organization,
      updateOrganizationDto,
    );
    return this.organizationRepository.save(updated);
  }

  /**
   * Removes an organization.
   * @param id - The UUID of the organization to remove
   * @param requesterId - The UUID of the user making the request
   * @throws NotFoundException if no organization with the given ID exists
   * @throws ForbiddenException if the requester is not the owner
   */
  async remove(id: string, requesterId: string): Promise<void> {
    const organization = await this.findOne(id);

    await this.assertOrgRole(id, requesterId, OrgRole.OWNER);

    await this.organizationRepository.remove(organization);
    this.logger.log(`Removed organization: ${organization.name}`);
  }

  // ---------------------------------------------------------------------------
  // Member management
  // ---------------------------------------------------------------------------

  /**
   * The role hierarchy weights used for comparison across member management methods.
   */
  private readonly roleHierarchy: Record<OrgRole, number> = {
    [OrgRole.OWNER]: 3,
    [OrgRole.ADMIN]: 2,
    [OrgRole.MEMBER]: 1,
  };

  /**
   * Returns a paginated list of members for the given organization.
   * Each record joins UserOrganization with its User relation to populate
   * username and email fields.
   * @param orgId - The UUID of the organization
   * @param skip - Number of records to skip
   * @param take - Number of records to return
   * @returns A tuple of [member response list, total count]
   */
  async findMembers(
    orgId: string,
    skip = 0,
    take = 20,
  ): Promise<[MemberResponseDto[], number]> {
    const [memberships, total] = await this.userOrganizationRepository
      .createQueryBuilder("uo")
      .innerJoinAndSelect("uo.user", "user")
      .where("uo.organizationId = :orgId", { orgId })
      .skip(skip)
      .take(take)
      .getManyAndCount();

    const data: MemberResponseDto[] = memberships.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return [data, total];
  }

  /**
   * Adds a user to an organization by username.
   * The OWNER role cannot be assigned through this method.
   * @param orgId - The UUID of the organization
   * @param requesterId - The UUID of the requester (enforced by guard, not re-checked here)
   * @param dto - Data containing the username and optional role
   * @returns The newly created member response
   * @throws BadRequestException if the requested role is OWNER
   * @throws NotFoundException if the user does not exist
   * @throws ConflictException if the user is already a member
   */
  async addMember(
    orgId: string,
    requesterId: string,
    dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    if (dto.role === OrgRole.OWNER) {
      throw new BadRequestException(
        "The OWNER role cannot be assigned when adding a member",
      );
    }

    const user = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (!user) {
      throw new NotFoundException(`User "${dto.username}" not found`);
    }

    const existing = await this.userOrganizationRepository.findOne({
      where: { organizationId: orgId, userId: user.id },
    });
    if (existing) {
      throw new ConflictException(
        `User "${dto.username}" is already a member of this organization`,
      );
    }

    const membership = this.userOrganizationRepository.create({
      userId: user.id,
      organizationId: orgId,
      role: dto.role ?? OrgRole.MEMBER,
    });
    const saved = await this.userOrganizationRepository.save(membership);

    this.logger.log(
      `Added member ${user.username} (${saved.role}) to org ${orgId}`,
    );

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: saved.role,
      joinedAt: saved.createdAt,
    };
  }

  /**
   * Updates the role of an existing organization member.
   * The OWNER role is immutable and cannot be assigned or changed via this method.
   * A requester cannot change the role of a member with an equal or higher role.
   * @param orgId - The UUID of the organization
   * @param requesterId - The UUID of the user making the request
   * @param targetUserId - The UUID of the member whose role should change
   * @param dto - Data containing the new role
   * @returns The updated member response
   * @throws BadRequestException if the new role is OWNER or the requester targets themselves
   * @throws NotFoundException if the target is not a member of the organization
   * @throws ForbiddenException if the requester lacks sufficient role over the target
   */
  async updateMemberRole(
    orgId: string,
    requesterId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    if (dto.role === OrgRole.OWNER) {
      throw new BadRequestException(
        "The owner role is immutable and cannot be assigned",
      );
    }

    if (requesterId === targetUserId) {
      throw new BadRequestException("You cannot change your own role");
    }

    const requesterMembership = await this.userOrganizationRepository.findOne({
      where: { organizationId: orgId, userId: requesterId },
    });
    if (!requesterMembership) {
      throw new ForbiddenException("You are not a member of this organization");
    }

    const targetMembership = await this.userOrganizationRepository.findOne({
      where: { organizationId: orgId, userId: targetUserId },
      relations: ["user"],
    });
    if (!targetMembership) {
      throw new NotFoundException(
        `Member with ID "${targetUserId}" not found in this organization`,
      );
    }

    const requesterWeight = this.roleHierarchy[requesterMembership.role] ?? 0;
    const targetWeight = this.roleHierarchy[targetMembership.role] ?? 0;

    if (requesterWeight <= targetWeight) {
      throw new ForbiddenException(
        "You cannot change the role of a member with an equal or higher role",
      );
    }

    targetMembership.role = dto.role;
    const saved = await this.userOrganizationRepository.save(targetMembership);

    this.logger.log(
      `Updated member ${targetUserId} role to ${dto.role} in org ${orgId}`,
    );

    return {
      userId: targetMembership.userId,
      username: targetMembership.user.username,
      email: targetMembership.user.email,
      role: saved.role,
      joinedAt: targetMembership.createdAt,
    };
  }

  /**
   * Removes a member from an organization.
   * The organization owner cannot be removed.
   * A requester cannot remove a member with an equal or higher role.
   * @param orgId - The UUID of the organization
   * @param requesterId - The UUID of the user making the request
   * @param targetUserId - The UUID of the member to remove
   * @throws BadRequestException if the target is the owner or the requester targets themselves
   * @throws NotFoundException if the target is not a member of the organization
   * @throws ForbiddenException if the requester lacks sufficient role over the target
   */
  async removeMember(
    orgId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    if (requesterId === targetUserId) {
      throw new BadRequestException(
        "You cannot remove yourself from the organization",
      );
    }

    const targetMembership = await this.userOrganizationRepository.findOne({
      where: { organizationId: orgId, userId: targetUserId },
    });
    if (!targetMembership) {
      throw new NotFoundException(
        `Member with ID "${targetUserId}" not found in this organization`,
      );
    }

    if (targetMembership.role === OrgRole.OWNER) {
      throw new BadRequestException("The organization owner cannot be removed");
    }

    const requesterMembership = await this.userOrganizationRepository.findOne({
      where: { organizationId: orgId, userId: requesterId },
    });
    if (!requesterMembership) {
      throw new ForbiddenException("You are not a member of this organization");
    }

    const requesterWeight = this.roleHierarchy[requesterMembership.role] ?? 0;
    const targetWeight = this.roleHierarchy[targetMembership.role] ?? 0;

    if (requesterWeight <= targetWeight) {
      throw new ForbiddenException(
        "You cannot remove a member with an equal or higher role",
      );
    }

    await this.userOrganizationRepository.remove(targetMembership);

    this.logger.log(`Removed member ${targetUserId} from org ${orgId}`);
  }

  // ---------------------------------------------------------------------------

  /**
   * Asserts that the user has at least the required role in the organization.
   * @param organizationId - The UUID of the organization
   * @param userId - The UUID of the user
   * @param requiredRole - The minimum required role
   * @throws ForbiddenException if the user does not have the required role
   */
  async assertOrgRole(
    organizationId: string,
    userId: string,
    requiredRole: OrgRole,
  ): Promise<void> {
    const membership = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId },
    });

    if (!membership || !this.satisfiesRole(membership.role, requiredRole)) {
      throw new ForbiddenException(
        `Insufficient organization permissions. Required role: ${requiredRole}`,
      );
    }
  }

  /**
   * Checks if the actual role satisfies the required role based on hierarchy.
   * Hierarchy: OWNER > ADMIN > MEMBER
   * @param actual - The user's actual role
   * @param required - The minimum required role
   * @returns True if the actual role satisfies the required role
   */
  satisfiesRole(actual: OrgRole, required: OrgRole): boolean {
    const hierarchy: Record<OrgRole, number> = {
      [OrgRole.OWNER]: 3,
      [OrgRole.ADMIN]: 2,
      [OrgRole.MEMBER]: 1,
    };
    return (hierarchy[actual] ?? 0) >= (hierarchy[required] ?? 0);
  }

  /**
   * Retrieves the UserOrganization record for a given user and organization.
   * @param userId - The UUID of the user
   * @param organizationId - The UUID of the organization
   * @returns The membership record, or null if not found
   */
  async getMembership(
    userId: string,
    organizationId: string,
  ): Promise<UserOrganization | null> {
    return this.userOrganizationRepository.findOne({
      where: { userId, organizationId },
    });
  }
}
