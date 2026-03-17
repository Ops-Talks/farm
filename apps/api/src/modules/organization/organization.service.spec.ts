import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrganizationService } from "./organization.service";
import { Organization } from "./entities/organization.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { User } from "../auth/entities/user.entity";
import { OrgRole } from "@farm/types";

describe("OrganizationService", () => {
  let service: OrganizationService;
  let orgRepo: Record<string, jest.Mock>;
  let userOrgRepo: Record<string, jest.Mock>;

  const ownerId = "owner-uuid-1";

  const mockOrg: Partial<Organization> = {
    id: "org-uuid-1",
    name: "Acme Corp",
    slug: "acme-corp",
    description: "A test organization",
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership: Partial<UserOrganization> = {
    id: "membership-uuid-1",
    userId: ownerId,
    organizationId: "org-uuid-1",
    role: OrgRole.OWNER,
  };

  beforeEach(async () => {
    orgRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
    };

    userOrgRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const userRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: userOrgRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an organization and add owner membership", async () => {
      orgRepo.findOne.mockResolvedValue(null);
      orgRepo.create.mockReturnValue(mockOrg);
      orgRepo.save.mockResolvedValue(mockOrg);
      userOrgRepo.create.mockReturnValue(mockMembership);
      userOrgRepo.save.mockResolvedValue(mockMembership);

      const result = await service.create(
        { name: "Acme Corp", description: "A test organization" },
        ownerId,
      );

      expect(result).toEqual(mockOrg);
      expect(orgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "acme-corp", ownerId }),
      );
      expect(userOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: OrgRole.OWNER, userId: ownerId }),
      );
    });

    it("should throw ConflictException when name already exists", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);

      await expect(
        service.create({ name: "Acme Corp" }, ownerId),
      ).rejects.toThrow(ConflictException);
    });

    it("should derive slug correctly from the name", async () => {
      orgRepo.findOne.mockResolvedValue(null);
      orgRepo.create.mockReturnValue({ ...mockOrg, slug: "my-org-name" });
      orgRepo.save.mockResolvedValue({ ...mockOrg, slug: "my-org-name" });
      userOrgRepo.create.mockReturnValue(mockMembership);
      userOrgRepo.save.mockResolvedValue(mockMembership);

      await service.create({ name: "My Org Name" }, ownerId);

      expect(orgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "my-org-name" }),
      );
    });
  });

  describe("findAll", () => {
    it("should return all organizations with pagination", async () => {
      orgRepo.findAndCount.mockResolvedValue([[mockOrg], 1]);

      const [data, total] = await service.findAll(0, 20);

      expect(data).toHaveLength(1);
      expect(total).toBe(1);
      expect(orgRepo.findAndCount).toHaveBeenCalledWith({
        order: { name: "ASC" },
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findOne", () => {
    it("should return an organization by ID", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);

      const result = await service.findOne("org-uuid-1");

      expect(result).toEqual(mockOrg);
    });

    it("should throw NotFoundException when organization is not found", async () => {
      orgRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update an organization when requester has sufficient role", async () => {
      const updated = { ...mockOrg, description: "Updated description" };
      orgRepo.findOne.mockResolvedValue(mockOrg);
      userOrgRepo.findOne.mockResolvedValue(mockMembership);
      orgRepo.merge.mockReturnValue(updated);
      orgRepo.save.mockResolvedValue(updated);

      const result = await service.update(
        "org-uuid-1",
        { description: "Updated description" },
        ownerId,
      );

      expect(result.description).toBe("Updated description");
    });

    it("should throw ForbiddenException when requester lacks required role", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);
      userOrgRepo.findOne.mockResolvedValue({
        ...mockMembership,
        role: OrgRole.MEMBER,
      });

      await expect(
        service.update("org-uuid-1", { description: "x" }, ownerId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ConflictException when new name already exists", async () => {
      orgRepo.findOne
        .mockResolvedValueOnce(mockOrg)
        .mockResolvedValueOnce({ ...mockOrg, id: "other-uuid", name: "Other" });
      userOrgRepo.findOne.mockResolvedValue(mockMembership);

      await expect(
        service.update("org-uuid-1", { name: "Other" }, ownerId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should remove an organization when requester is owner", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);
      userOrgRepo.findOne.mockResolvedValue(mockMembership);
      orgRepo.remove.mockResolvedValue(mockOrg);

      await service.remove("org-uuid-1", ownerId);

      expect(orgRepo.remove).toHaveBeenCalledWith(mockOrg);
    });

    it("should throw ForbiddenException when requester is not owner", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);
      userOrgRepo.findOne.mockResolvedValue({
        ...mockMembership,
        role: OrgRole.ADMIN,
      });

      await expect(service.remove("org-uuid-1", ownerId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("satisfiesRole", () => {
    it("should allow OWNER to satisfy any role requirement", () => {
      expect(service.satisfiesRole(OrgRole.OWNER, OrgRole.OWNER)).toBe(true);
      expect(service.satisfiesRole(OrgRole.OWNER, OrgRole.ADMIN)).toBe(true);
      expect(service.satisfiesRole(OrgRole.OWNER, OrgRole.MEMBER)).toBe(true);
    });

    it("should allow ADMIN to satisfy ADMIN and MEMBER requirements", () => {
      expect(service.satisfiesRole(OrgRole.ADMIN, OrgRole.OWNER)).toBe(false);
      expect(service.satisfiesRole(OrgRole.ADMIN, OrgRole.ADMIN)).toBe(true);
      expect(service.satisfiesRole(OrgRole.ADMIN, OrgRole.MEMBER)).toBe(true);
    });

    it("should allow MEMBER to satisfy only MEMBER requirement", () => {
      expect(service.satisfiesRole(OrgRole.MEMBER, OrgRole.OWNER)).toBe(false);
      expect(service.satisfiesRole(OrgRole.MEMBER, OrgRole.ADMIN)).toBe(false);
      expect(service.satisfiesRole(OrgRole.MEMBER, OrgRole.MEMBER)).toBe(true);
    });
  });

  describe("getMembership", () => {
    it("should return the membership record", async () => {
      userOrgRepo.findOne.mockResolvedValue(mockMembership);

      const result = await service.getMembership(ownerId, "org-uuid-1");

      expect(result).toEqual(mockMembership);
    });

    it("should return null when membership does not exist", async () => {
      userOrgRepo.findOne.mockResolvedValue(null);

      const result = await service.getMembership("nonexistent", "org-uuid-1");

      expect(result).toBeNull();
    });
  });
});
