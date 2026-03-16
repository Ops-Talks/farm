import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "./entities/organization.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
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
      .replace(/^-+|-+$/g, "");
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
