import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrganizationService } from "../organization.service";
import { Organization } from "../entities/organization.entity";
import { UserOrganization } from "../entities/user-organization.entity";
import { User } from "../../auth/entities/user.entity";
import { OrgRole } from "@farm/types";

describe("OrganizationService — member management", () => {
  let service: OrganizationService;
  let orgRepo: Record<string, jest.Mock>;
  let userOrgRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  // Fixed UUIDs used throughout the tests
  const ownerId = "owner-uuid-1";
  const adminId = "admin-uuid-2";
  const memberId = "member-uuid-3";
  const outsiderId = "outsider-uuid-4";
  const orgId = "org-uuid-1";

  const mockOwnerUser: Partial<User> = {
    id: ownerId,
    username: "owner_user",
    email: "owner@example.com",
  };

  const mockAdminUser: Partial<User> = {
    id: adminId,
    username: "admin_user",
    email: "admin@example.com",
  };

  const mockMemberUser: Partial<User> = {
    id: memberId,
    username: "member_user",
    email: "member@example.com",
  };

  const mockOwnerMembership: Partial<UserOrganization> = {
    id: "mem-uuid-1",
    userId: ownerId,
    organizationId: orgId,
    role: OrgRole.OWNER,
    createdAt: new Date("2023-01-01"),
    user: mockOwnerUser as User,
  };

  const mockAdminMembership: Partial<UserOrganization> = {
    id: "mem-uuid-2",
    userId: adminId,
    organizationId: orgId,
    role: OrgRole.ADMIN,
    createdAt: new Date("2023-02-01"),
    user: mockAdminUser as User,
  };

  const mockMemberMembership: Partial<UserOrganization> = {
    id: "mem-uuid-3",
    userId: memberId,
    organizationId: orgId,
    role: OrgRole.MEMBER,
    createdAt: new Date("2023-03-01"),
    user: mockMemberUser as User,
  };

  // Reusable query-builder mock factory
  const buildQueryBuilderMock = () => {
    const qb = {
      innerJoinAndSelect: jest.fn(),
      where: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      getManyAndCount: jest.fn(),
    };
    qb.innerJoinAndSelect.mockReturnValue(qb);
    qb.where.mockReturnValue(qb);
    qb.skip.mockReturnValue(qb);
    qb.take.mockReturnValue(qb);
    return qb;
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
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRepo = {
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
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  // ---------------------------------------------------------------------------
  // findMembers
  // ---------------------------------------------------------------------------

  describe("findMembers", () => {
    it("should return a paginated list of members with user details", async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([
        [mockOwnerMembership, mockAdminMembership],
        2,
      ]);
      userOrgRepo.createQueryBuilder.mockReturnValue(qb);

      const [data, total] = await service.findMembers(orgId, 0, 20);

      expect(total).toBe(2);
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        userId: ownerId,
        username: "owner_user",
        email: "owner@example.com",
        role: OrgRole.OWNER,
      });
      expect(data[1]).toMatchObject({
        userId: adminId,
        username: "admin_user",
        email: "admin@example.com",
        role: OrgRole.ADMIN,
      });

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith("uo.user", "user");
      expect(qb.where).toHaveBeenCalledWith("uo.organizationId = :orgId", {
        orgId,
      });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it("should apply skip and take when paginating", async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      userOrgRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findMembers(orgId, 10, 5);

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

  // ---------------------------------------------------------------------------
  // addMember
  // ---------------------------------------------------------------------------

  describe("addMember", () => {
    it("should add a member with default MEMBER role on success", async () => {
      userRepo.findOne.mockResolvedValue(mockMemberUser);
      userOrgRepo.findOne.mockResolvedValue(null);
      const savedMembership = {
        ...mockMemberMembership,
        role: OrgRole.MEMBER,
        createdAt: new Date("2023-03-01"),
      };
      userOrgRepo.create.mockReturnValue(savedMembership);
      userOrgRepo.save.mockResolvedValue(savedMembership);

      const result = await service.addMember(orgId, ownerId, {
        username: "member_user",
      });

      expect(result).toMatchObject({
        userId: memberId,
        username: "member_user",
        email: "member@example.com",
        role: OrgRole.MEMBER,
      });
      expect(userOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: memberId,
          organizationId: orgId,
          role: OrgRole.MEMBER,
        }),
      );
    });

    it("should assign the provided role when specified", async () => {
      userRepo.findOne.mockResolvedValue(mockAdminUser);
      userOrgRepo.findOne.mockResolvedValue(null);
      const savedMembership = { ...mockAdminMembership, createdAt: new Date() };
      userOrgRepo.create.mockReturnValue(savedMembership);
      userOrgRepo.save.mockResolvedValue(savedMembership);

      const result = await service.addMember(orgId, ownerId, {
        username: "admin_user",
        role: OrgRole.ADMIN,
      });

      expect(result.role).toBe(OrgRole.ADMIN);
    });

    it("should throw NotFoundException when the user does not exist", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember(orgId, ownerId, { username: "ghost_user" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when the user is already a member", async () => {
      userRepo.findOne.mockResolvedValue(mockMemberUser);
      userOrgRepo.findOne.mockResolvedValue(mockMemberMembership);

      await expect(
        service.addMember(orgId, ownerId, { username: "member_user" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when attempting to add with the OWNER role", async () => {
      await expect(
        service.addMember(orgId, ownerId, {
          username: "someone",
          role: OrgRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // updateMemberRole
  // ---------------------------------------------------------------------------

  describe("updateMemberRole", () => {
    it("should update the member role on success", async () => {
      // Requester is OWNER, target is MEMBER
      userOrgRepo.findOne
        .mockResolvedValueOnce(mockOwnerMembership) // requester
        .mockResolvedValueOnce({ ...mockMemberMembership }); // target

      const updatedMembership = {
        ...mockMemberMembership,
        role: OrgRole.ADMIN,
      };
      userOrgRepo.save.mockResolvedValue(updatedMembership);

      const result = await service.updateMemberRole(orgId, ownerId, memberId, {
        role: OrgRole.ADMIN,
      });

      expect(result.role).toBe(OrgRole.ADMIN);
      expect(result.userId).toBe(memberId);
    });

    it("should throw BadRequestException when setting the OWNER role", async () => {
      await expect(
        service.updateMemberRole(orgId, ownerId, memberId, {
          role: OrgRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when requester targets their own role", async () => {
      await expect(
        service.updateMemberRole(orgId, ownerId, ownerId, {
          role: OrgRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException when requester is not in the org", async () => {
      userOrgRepo.findOne.mockResolvedValueOnce(null); // requester not found

      await expect(
        service.updateMemberRole(orgId, outsiderId, memberId, {
          role: OrgRole.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when target member does not exist", async () => {
      userOrgRepo.findOne
        .mockResolvedValueOnce(mockOwnerMembership) // requester
        .mockResolvedValueOnce(null); // target not found

      await expect(
        service.updateMemberRole(orgId, ownerId, "nonexistent-uuid", {
          role: OrgRole.MEMBER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when ADMIN tries to change another ADMIN role", async () => {
      const secondAdmin = {
        ...mockAdminMembership,
        id: "mem-uuid-99",
        userId: "admin-uuid-99",
        user: { id: "admin-uuid-99", username: "admin2", email: "a2@x.com" },
      };

      userOrgRepo.findOne
        .mockResolvedValueOnce(mockAdminMembership) // requester = ADMIN
        .mockResolvedValueOnce(secondAdmin); // target = ADMIN (equal)

      await expect(
        service.updateMemberRole(orgId, adminId, "admin-uuid-99", {
          role: OrgRole.MEMBER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // removeMember
  // ---------------------------------------------------------------------------

  describe("removeMember", () => {
    it("should remove a member on success", async () => {
      userOrgRepo.findOne
        .mockResolvedValueOnce(mockMemberMembership) // target
        .mockResolvedValueOnce(mockOwnerMembership); // requester
      userOrgRepo.remove.mockResolvedValue(undefined);

      await service.removeMember(orgId, ownerId, memberId);

      expect(userOrgRepo.remove).toHaveBeenCalledWith(mockMemberMembership);
    });

    it("should throw BadRequestException when the requester targets themselves", async () => {
      await expect(
        service.removeMember(orgId, memberId, memberId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when the target member does not exist", async () => {
      userOrgRepo.findOne.mockResolvedValueOnce(null); // target not found

      await expect(
        service.removeMember(orgId, ownerId, "nonexistent-uuid"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when attempting to remove the owner", async () => {
      userOrgRepo.findOne.mockResolvedValueOnce(mockOwnerMembership); // target = OWNER

      await expect(
        service.removeMember(orgId, adminId, ownerId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException when requester is not in the org", async () => {
      userOrgRepo.findOne
        .mockResolvedValueOnce(mockMemberMembership) // target found
        .mockResolvedValueOnce(null); // requester not in org

      await expect(
        service.removeMember(orgId, outsiderId, memberId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when ADMIN tries to remove another ADMIN", async () => {
      const secondAdmin = {
        ...mockAdminMembership,
        id: "mem-uuid-99",
        userId: "admin-uuid-99",
      };

      userOrgRepo.findOne
        .mockResolvedValueOnce(secondAdmin) // target = ADMIN
        .mockResolvedValueOnce(mockAdminMembership); // requester = ADMIN (equal)

      await expect(
        service.removeMember(orgId, adminId, "admin-uuid-99"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
