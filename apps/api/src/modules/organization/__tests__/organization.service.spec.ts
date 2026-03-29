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
import {
  OrgInvitation,
  InvitationStatus,
} from "../entities/org-invitation.entity";
import { OrgRole } from "@farm/types";
import { QUEUE_NAMES } from "../../../common/queues/queue-names";

describe("OrganizationService — member management", () => {
  let service: OrganizationService;
  let orgRepo: Record<string, jest.Mock>;
  let userOrgRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let invitationRepo: Record<string, jest.Mock>;

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

    invitationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
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
        {
          provide: getRepositoryToken(OrgInvitation),
          useValue: invitationRepo,
        },
        {
          provide: `BullQueue_${QUEUE_NAMES.NOTIFICATIONS}`,
          useValue: undefined,
        },
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

// ---------------------------------------------------------------------------
// Invitation management tests
// ---------------------------------------------------------------------------

describe("OrganizationService — invitation management", () => {
  let service: OrganizationService;
  let orgRepo: Record<string, jest.Mock>;
  let userOrgRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let invitationRepo: Record<string, jest.Mock>;
  let notificationsQueue: Record<string, jest.Mock>;

  const orgId = "org-uuid-1";
  const inviterId = "inviter-uuid-1";
  const inviteeEmail = "invitee@example.com";
  const invitationId = "inv-uuid-1";

  const mockOrg: Partial<Organization> = {
    id: orgId,
    name: "Acme Corp",
    slug: "acme-corp",
    ownerId: inviterId,
  };

  const mockAcceptingUser: Partial<User> = {
    id: "acceptor-uuid",
    username: "acceptor_user",
    email: "acceptor@example.com",
  };

  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 1000);

  const mockPendingInvitation: Partial<OrgInvitation> = {
    id: invitationId,
    organizationId: orgId,
    email: inviteeEmail,
    tokenHash: "abc123hash",
    status: InvitationStatus.PENDING,
    role: "member",
    expiresAt: futureDate,
    invitedByUserId: inviterId,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
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

    invitationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    notificationsQueue = {
      add: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: getRepositoryToken(OrgInvitation),
          useValue: invitationRepo,
        },
        {
          provide: `BullQueue_${QUEUE_NAMES.NOTIFICATIONS}`,
          useValue: notificationsQueue,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  // ---------------------------------------------------------------------------
  // createInvitation
  // ---------------------------------------------------------------------------

  describe("createInvitation", () => {
    it("should create an invitation and return the response DTO on success", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockReturnValue(mockPendingInvitation);
      invitationRepo.save.mockResolvedValue(mockPendingInvitation);

      const result = await service.createInvitation(
        orgId,
        { email: inviteeEmail, role: OrgRole.MEMBER },
        inviterId,
      );

      expect(result.id).toBe(invitationId);
      expect(result.organizationId).toBe(orgId);
      expect(result.email).toBe(inviteeEmail);
      expect(result.role).toBe("member");
      expect(result.status).toBe(InvitationStatus.PENDING);
      // Plain token must never be in the response
      expect((result as Record<string, unknown>)["tokenHash"]).toBeUndefined();
      expect((result as Record<string, unknown>)["token"]).toBeUndefined();
    });

    it("should throw NotFoundException when the organization does not exist", async () => {
      orgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createInvitation(orgId, { email: inviteeEmail }, inviterId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when a pending invitation already exists", async () => {
      orgRepo.findOne.mockResolvedValue(mockOrg);
      invitationRepo.findOne.mockResolvedValue(mockPendingInvitation);

      await expect(
        service.createInvitation(orgId, { email: inviteeEmail }, inviterId),
      ).rejects.toThrow(ConflictException);
    });

    it("should not enqueue a notification in test environment", async () => {
      // NODE_ENV is already "test" in the test runner
      orgRepo.findOne.mockResolvedValue(mockOrg);
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockReturnValue(mockPendingInvitation);
      invitationRepo.save.mockResolvedValue(mockPendingInvitation);

      await service.createInvitation(orgId, { email: inviteeEmail }, inviterId);

      // Queue should NOT be called because NODE_ENV === "test"
      expect(notificationsQueue.add).not.toHaveBeenCalled();
    });

    it("should enqueue a notification email when NODE_ENV is not test", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      orgRepo.findOne.mockResolvedValue(mockOrg);
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockReturnValue(mockPendingInvitation);
      invitationRepo.save.mockResolvedValue(mockPendingInvitation);
      userRepo.findOne.mockResolvedValue({
        id: inviterId,
        username: "inviter_user",
      });

      await service.createInvitation(orgId, { email: inviteeEmail }, inviterId);

      expect(notificationsQueue.add).toHaveBeenCalledWith(
        "email",
        expect.objectContaining({
          type: "email",
          recipient: inviteeEmail,
          template: "org-invitation",
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should use invitedByUserId as inviterName when user is not found", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      orgRepo.findOne.mockResolvedValue(mockOrg);
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockReturnValue(mockPendingInvitation);
      invitationRepo.save.mockResolvedValue(mockPendingInvitation);
      userRepo.findOne.mockResolvedValue(null);

      await service.createInvitation(orgId, { email: inviteeEmail }, inviterId);

      const [, jobData] = notificationsQueue.add.mock.calls[0] as [
        string,
        { payload: { inviterName: string } },
      ];
      expect(jobData.payload.inviterName).toBe(inviterId);

      process.env.NODE_ENV = originalEnv;
    });
  });

  // ---------------------------------------------------------------------------
  // listInvitations
  // ---------------------------------------------------------------------------

  describe("listInvitations", () => {
    it("should return an array of pending invitations ordered by createdAt DESC", async () => {
      invitationRepo.find.mockResolvedValue([mockPendingInvitation]);

      const result = await service.listInvitations(orgId);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(inviteeEmail);
      expect(result[0].status).toBe(InvitationStatus.PENDING);
      expect(invitationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: orgId,
            status: InvitationStatus.PENDING,
          },
          order: { createdAt: "DESC" },
        }),
      );
    });

    it("should return an empty array when there are no pending invitations", async () => {
      invitationRepo.find.mockResolvedValue([]);

      const result = await service.listInvitations(orgId);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // cancelInvitation
  // ---------------------------------------------------------------------------

  describe("cancelInvitation", () => {
    it("should set invitation status to DECLINED on success", async () => {
      const invitation = { ...mockPendingInvitation };
      invitationRepo.findOne.mockResolvedValue(invitation);
      invitationRepo.save.mockImplementation((inv: OrgInvitation) =>
        Promise.resolve(inv),
      );

      await service.cancelInvitation(orgId, invitationId);

      expect(invitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.DECLINED }),
      );
    });

    it("should throw NotFoundException when the invitation does not exist", async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelInvitation(orgId, "nonexistent-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when the invitation is no longer pending", async () => {
      const acceptedInvitation = {
        ...mockPendingInvitation,
        status: InvitationStatus.ACCEPTED,
      };
      invitationRepo.findOne.mockResolvedValue(acceptedInvitation);

      await expect(
        service.cancelInvitation(orgId, invitationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // acceptInvitation
  // ---------------------------------------------------------------------------

  describe("acceptInvitation", () => {
    const plainToken = "plaintoken1234";

    it("should create a UserOrganization membership and return MemberResponseDto on success", async () => {
      invitationRepo.findOne.mockResolvedValue({ ...mockPendingInvitation });
      userOrgRepo.findOne.mockResolvedValue(null);
      const savedMembership = {
        userId: "acceptor-uuid",
        organizationId: orgId,
        role: "member",
        createdAt: new Date(),
      };
      userOrgRepo.create.mockReturnValue(savedMembership);
      userOrgRepo.save.mockResolvedValue(savedMembership);
      invitationRepo.save.mockImplementation((inv: OrgInvitation) =>
        Promise.resolve(inv),
      );
      userRepo.findOne.mockResolvedValue(mockAcceptingUser);

      const result = await service.acceptInvitation(
        plainToken,
        "acceptor-uuid",
      );

      expect(result.userId).toBe("acceptor-uuid");
      expect(result.username).toBe("acceptor_user");
      expect(result.role).toBe("member");
      expect(userOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "acceptor-uuid",
          organizationId: orgId,
          role: "member",
        }),
      );
      expect(invitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      );
    });

    it("should throw NotFoundException when the token does not match any invitation", async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acceptInvitation(plainToken, "acceptor-uuid"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when the invitation has already been accepted", async () => {
      invitationRepo.findOne.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(
        service.acceptInvitation(plainToken, "acceptor-uuid"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when the invitation has expired", async () => {
      invitationRepo.findOne.mockResolvedValue({
        ...mockPendingInvitation,
        expiresAt: pastDate,
      });

      await expect(
        service.acceptInvitation(plainToken, "acceptor-uuid"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when the user is already a member", async () => {
      invitationRepo.findOne.mockResolvedValue({ ...mockPendingInvitation });
      userOrgRepo.findOne.mockResolvedValue({
        userId: "acceptor-uuid",
        organizationId: orgId,
      });

      await expect(
        service.acceptInvitation(plainToken, "acceptor-uuid"),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // getMembership
  // ---------------------------------------------------------------------------

  describe("getMembership", () => {
    it("should return the UserOrganization record when found", async () => {
      const mockMembership = {
        userId: "inviter-uuid-1",
        organizationId: "org-uuid-1",
        role: OrgRole.OWNER,
        createdAt: new Date("2023-01-01"),
      };
      userOrgRepo.findOne.mockResolvedValue(mockMembership);

      const result = await service.getMembership(
        "inviter-uuid-1",
        "org-uuid-1",
      );

      expect(result).toEqual(mockMembership);
      expect(userOrgRepo.findOne).toHaveBeenCalledWith({
        where: { userId: "inviter-uuid-1", organizationId: "org-uuid-1" },
      });
    });

    it("should return null when the user is not a member", async () => {
      userOrgRepo.findOne.mockResolvedValue(null);

      const result = await service.getMembership("outsider-uuid", "org-uuid-1");

      expect(result).toBeNull();
    });
  });
});
