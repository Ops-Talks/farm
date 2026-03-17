import { Test, TestingModule } from "@nestjs/testing";
import { Request as ExpressRequest } from "express";
import { OrganizationController } from "../organization.controller";
import { OrganizationService } from "../organization.service";
import { Organization } from "../entities/organization.entity";
import { MemberResponseDto } from "../dto/member-response.dto";
import { PaginatedResponseDto } from "../../../common/dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { OrgRolesGuard } from "../../../common/guards/org-roles.guard";
import { OrgRole } from "@farm/types";

/**
 * Local mirror of the private AuthenticatedRequest interface used inside the
 * controller so that mock request objects can be typed without re-exporting it.
 */
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    roles: string[];
  };
}

describe("OrganizationController", () => {
  let controller: OrganizationController;
  let service: OrganizationService;

  const mockOrg: Partial<Organization> = {
    id: "org-uuid-1",
    name: "Acme Corp",
    slug: "acme-corp",
    description: "Global leader in ACME products",
    ownerId: "user-uuid-1",
    userOrganizations: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockMember: MemberResponseDto = {
    userId: "user-uuid-2",
    username: "john_doe",
    email: "john@example.com",
    role: OrgRole.MEMBER,
    joinedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockRequest = {
    user: {
      userId: "user-uuid-1",
      username: "admin",
      roles: ["admin"],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockOrg),
            findAll: jest.fn().mockResolvedValue([[mockOrg], 1]),
            findOne: jest.fn().mockResolvedValue(mockOrg),
            update: jest.fn().mockResolvedValue(mockOrg),
            remove: jest.fn().mockResolvedValue(undefined),
            findMembers: jest.fn().mockResolvedValue([[mockMember], 1]),
            addMember: jest.fn().mockResolvedValue(mockMember),
            updateMemberRole: jest.fn().mockResolvedValue(mockMember),
            removeMember: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationController>(OrganizationController);
    service = module.get<OrganizationService>(OrganizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create an organization and return it", async () => {
      const dto = { name: "Acme Corp" };
      const result = await controller.create(dto, mockRequest);

      expect(result).toEqual(mockOrg);
      expect(service.create).toHaveBeenCalledWith(dto, "user-uuid-1");
    });

    it("should pass the caller's userId to the service", async () => {
      const otherRequest = {
        user: { userId: "other-user-uuid", username: "bob", roles: [] },
      } as unknown as AuthenticatedRequest;

      await controller.create({ name: "Other Org" }, otherRequest);

      expect(service.create).toHaveBeenCalledWith(
        { name: "Other Org" },
        "other-user-uuid",
      );
    });

    it("should propagate errors thrown by the service", async () => {
      (service.create as jest.Mock).mockRejectedValueOnce(
        new Error("Conflict"),
      );

      await expect(
        controller.create({ name: "Acme Corp" }, mockRequest),
      ).rejects.toThrow("Conflict");
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe("findAll", () => {
    it("should return a PaginatedResponseDto with default pagination values", async () => {
      const result = await controller.findAll({ skip: 0, take: 20 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(service.findAll).toHaveBeenCalledWith(0, 20);
    });

    it("should forward custom skip and take values to the service", async () => {
      (service.findAll as jest.Mock).mockResolvedValueOnce([
        [mockOrg, mockOrg],
        2,
      ]);

      const result = await controller.findAll({ skip: 10, take: 5 });

      expect(result.skip).toBe(10);
      expect(result.take).toBe(5);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledWith(10, 5);
    });

    it("should fall back to 0 and 20 when skip and take are undefined", async () => {
      const result = await controller.findAll({});

      // The controller uses `pagination.skip ?? 0` and `pagination.take ?? 20`
      // when constructing the PaginatedResponseDto, so even when undefined is
      // forwarded to the service the response DTO carries the correct defaults.
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it("should return an empty data array when the service returns no results", async () => {
      (service.findAll as jest.Mock).mockResolvedValueOnce([[], 0]);

      const result = await controller.findAll({ skip: 0, take: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe("findOne", () => {
    it("should return the organization matching the given id", async () => {
      const result = await controller.findOne("org-uuid-1");

      expect(result).toEqual(mockOrg);
      expect(service.findOne).toHaveBeenCalledWith("org-uuid-1");
    });

    it("should propagate NotFoundException thrown by the service", async () => {
      (service.findOne as jest.Mock).mockRejectedValueOnce(
        new Error("Not Found"),
      );

      await expect(controller.findOne("nonexistent")).rejects.toThrow(
        "Not Found",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe("update", () => {
    it("should update the organization and return the result", async () => {
      const dto = { name: "Acme Corp Updated" };
      const result = await controller.update("org-uuid-1", dto, mockRequest);

      expect(result).toEqual(mockOrg);
      expect(service.update).toHaveBeenCalledWith(
        "org-uuid-1",
        dto,
        "user-uuid-1",
      );
    });

    it("should forward the caller's userId when updating", async () => {
      const otherRequest = {
        user: { userId: "owner-uuid", username: "owner", roles: ["admin"] },
      } as unknown as AuthenticatedRequest;

      await controller.update(
        "org-uuid-1",
        { description: "desc" },
        otherRequest,
      );

      expect(service.update).toHaveBeenCalledWith(
        "org-uuid-1",
        { description: "desc" },
        "owner-uuid",
      );
    });

    it("should propagate errors thrown by the service", async () => {
      (service.update as jest.Mock).mockRejectedValueOnce(
        new Error("Conflict"),
      );

      await expect(
        controller.update("org-uuid-1", { name: "x" }, mockRequest),
      ).rejects.toThrow("Conflict");
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("should remove the organization and return undefined", async () => {
      const result = await controller.remove("org-uuid-1", mockRequest);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith("org-uuid-1", "user-uuid-1");
    });

    it("should forward the caller's userId when removing", async () => {
      const ownerRequest = {
        user: { userId: "owner-uuid", username: "owner", roles: ["owner"] },
      } as unknown as AuthenticatedRequest;

      await controller.remove("org-uuid-1", ownerRequest);

      expect(service.remove).toHaveBeenCalledWith("org-uuid-1", "owner-uuid");
    });

    it("should propagate errors thrown by the service", async () => {
      (service.remove as jest.Mock).mockRejectedValueOnce(
        new Error("Forbidden"),
      );

      await expect(
        controller.remove("org-uuid-1", mockRequest),
      ).rejects.toThrow("Forbidden");
    });
  });

  // ---------------------------------------------------------------------------
  // findMembers
  // ---------------------------------------------------------------------------

  describe("findMembers", () => {
    it("should return a PaginatedResponseDto of MemberResponseDto with default pagination", async () => {
      const result = await controller.findMembers("org-uuid-1", {
        skip: 0,
        take: 20,
      });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockMember);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(service.findMembers).toHaveBeenCalledWith("org-uuid-1", 0, 20);
    });

    it("should forward custom pagination to the service", async () => {
      (service.findMembers as jest.Mock).mockResolvedValueOnce([
        [mockMember, mockMember],
        5,
      ]);

      const result = await controller.findMembers("org-uuid-1", {
        skip: 2,
        take: 10,
      });

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(2);
      expect(result.skip).toBe(2);
      expect(result.take).toBe(10);
      expect(service.findMembers).toHaveBeenCalledWith("org-uuid-1", 2, 10);
    });

    it("should fall back to 0 and 20 when skip and take are undefined", async () => {
      const result = await controller.findMembers("org-uuid-1", {});

      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it("should return an empty data array when the organization has no members", async () => {
      (service.findMembers as jest.Mock).mockResolvedValueOnce([[], 0]);

      const result = await controller.findMembers("org-uuid-1", {
        skip: 0,
        take: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // addMember
  // ---------------------------------------------------------------------------

  describe("addMember", () => {
    it("should add a member and return the MemberResponseDto", async () => {
      const dto = { username: "john_doe", role: OrgRole.MEMBER };
      const result = await controller.addMember("org-uuid-1", dto, mockRequest);

      expect(result).toEqual(mockMember);
      expect(service.addMember).toHaveBeenCalledWith(
        "org-uuid-1",
        "user-uuid-1",
        dto,
      );
    });

    it("should add a member without an explicit role", async () => {
      const dto = { username: "jane_doe" };
      await controller.addMember("org-uuid-1", dto, mockRequest);

      expect(service.addMember).toHaveBeenCalledWith(
        "org-uuid-1",
        "user-uuid-1",
        dto,
      );
    });

    it("should propagate errors thrown by the service", async () => {
      (service.addMember as jest.Mock).mockRejectedValueOnce(
        new Error("Conflict"),
      );

      await expect(
        controller.addMember(
          "org-uuid-1",
          { username: "john_doe" },
          mockRequest,
        ),
      ).rejects.toThrow("Conflict");
    });
  });

  // ---------------------------------------------------------------------------
  // updateMemberRole
  // ---------------------------------------------------------------------------

  describe("updateMemberRole", () => {
    it("should update the member role and return the updated MemberResponseDto", async () => {
      const dto = { role: OrgRole.ADMIN };
      const result = await controller.updateMemberRole(
        "org-uuid-1",
        "user-uuid-2",
        dto,
        mockRequest,
      );

      expect(result).toEqual(mockMember);
      expect(service.updateMemberRole).toHaveBeenCalledWith(
        "org-uuid-1",
        "user-uuid-1",
        "user-uuid-2",
        dto,
      );
    });

    it("should forward the caller's userId and the target userId to the service", async () => {
      const callerRequest = {
        user: { userId: "admin-uuid", username: "admin", roles: ["admin"] },
      } as unknown as AuthenticatedRequest;

      await controller.updateMemberRole(
        "org-uuid-1",
        "target-user-uuid",
        { role: OrgRole.MEMBER },
        callerRequest,
      );

      expect(service.updateMemberRole).toHaveBeenCalledWith(
        "org-uuid-1",
        "admin-uuid",
        "target-user-uuid",
        { role: OrgRole.MEMBER },
      );
    });

    it("should propagate errors thrown by the service", async () => {
      (service.updateMemberRole as jest.Mock).mockRejectedValueOnce(
        new Error("BadRequest"),
      );

      await expect(
        controller.updateMemberRole(
          "org-uuid-1",
          "user-uuid-2",
          { role: OrgRole.ADMIN },
          mockRequest,
        ),
      ).rejects.toThrow("BadRequest");
    });
  });

  // ---------------------------------------------------------------------------
  // removeMember
  // ---------------------------------------------------------------------------

  describe("removeMember", () => {
    it("should remove a member and return undefined", async () => {
      const result = await controller.removeMember(
        "org-uuid-1",
        "user-uuid-2",
        mockRequest,
      );

      expect(result).toBeUndefined();
      expect(service.removeMember).toHaveBeenCalledWith(
        "org-uuid-1",
        "user-uuid-1",
        "user-uuid-2",
      );
    });

    it("should forward the caller's userId and the target userId to the service", async () => {
      const callerRequest = {
        user: { userId: "admin-uuid", username: "admin", roles: ["admin"] },
      } as unknown as AuthenticatedRequest;

      await controller.removeMember(
        "org-uuid-1",
        "target-user-uuid",
        callerRequest,
      );

      expect(service.removeMember).toHaveBeenCalledWith(
        "org-uuid-1",
        "admin-uuid",
        "target-user-uuid",
      );
    });

    it("should propagate errors thrown by the service", async () => {
      (service.removeMember as jest.Mock).mockRejectedValueOnce(
        new Error("Forbidden"),
      );

      await expect(
        controller.removeMember("org-uuid-1", "user-uuid-2", mockRequest),
      ).rejects.toThrow("Forbidden");
    });
  });
});
