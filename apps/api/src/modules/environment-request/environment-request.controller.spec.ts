import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { EnvironmentRequestController } from "./environment-request.controller";
import { EnvironmentRequestService } from "./environment-request.service";
import {
  EnvironmentRequest,
  EnvironmentRequestStatus,
  EnvironmentType,
  EnvironmentTier,
} from "./entities/environment-request.entity";
import { CreateEnvironmentRequestDto } from "./dto/create-environment-request.dto";
import { UpdateEnvironmentRequestDto } from "./dto/update-environment-request.dto";
import { PaginatedResponseDto } from "../../common/dto";

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  expire: jest.fn(),
};

describe("EnvironmentRequestController", () => {
  let controller: EnvironmentRequestController;
  let envService: typeof mockService;

  const mockEnvRequest: EnvironmentRequest = {
    id: "req-uuid-1",
    name: "staging-feature-x",
    description: "Staging env for feature X",
    requestedBy: "user-uuid-1",
    type: EnvironmentType.EPHEMERAL,
    tier: EnvironmentTier.SMALL,
    ttlHours: 24,
    status: EnvironmentRequestStatus.PENDING,
    statusMessage: null,
    reviewedBy: null,
    reviewedAt: null,
    provisionedAt: null,
    expiresAt: null,
    componentId: null,
    environmentId: null,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockRequest = {
    user: { userId: "user-uuid-1", username: "testuser", roles: ["admin"] },
    organizationId: "org-uuid-1",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnvironmentRequestController],
      providers: [
        { provide: EnvironmentRequestService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<EnvironmentRequestController>(
      EnvironmentRequestController,
    );
    envService = module.get(EnvironmentRequestService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / (create)", () => {
    it("should create an environment request", async () => {
      const dto: CreateEnvironmentRequestDto = {
        name: "staging-feature-x",
        type: EnvironmentType.EPHEMERAL,
        tier: EnvironmentTier.SMALL,
      };
      envService.create.mockResolvedValue(mockEnvRequest);

      const result = await controller.create(mockRequest as any, dto);

      expect(result).toEqual(mockEnvRequest);
      expect(envService.create).toHaveBeenCalledWith(
        dto,
        "user-uuid-1",
        "org-uuid-1",
      );
    });
  });

  describe("GET / (findAll)", () => {
    it("should list environment requests with pagination", async () => {
      envService.findAll.mockResolvedValue([[mockEnvRequest], 1]);

      const result = await controller.findAll(
        { skip: 0, take: 20 },
        mockRequest as any,
      );

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([mockEnvRequest]);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it("should default skip to 0 and take to 20 when query values are undefined", async () => {
      envService.findAll.mockResolvedValue([[mockEnvRequest], 1]);

      const result = await controller.findAll(
        { skip: undefined, take: undefined },
        mockRequest as any,
      );

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it("should default organizationId from request when not in query", async () => {
      envService.findAll.mockResolvedValue([[mockEnvRequest], 1]);

      const query = { skip: 0, take: 20 } as any;
      await controller.findAll(query, mockRequest as any);

      expect(query.organizationId).toBe("org-uuid-1");
      expect(envService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-uuid-1" }),
      );
    });

    it("should not override explicit organizationId in query", async () => {
      envService.findAll.mockResolvedValue([[mockEnvRequest], 1]);

      const query = { skip: 0, take: 20, organizationId: "org-from-query" };
      await controller.findAll(query as any, mockRequest as any);

      expect(query.organizationId).toBe("org-from-query");
    });
  });

  describe("GET /:id (findOne)", () => {
    it("should get an environment request by ID", async () => {
      envService.findOne.mockResolvedValue(mockEnvRequest);

      const result = await controller.findOne("req-uuid-1");

      expect(result).toEqual(mockEnvRequest);
      expect(envService.findOne).toHaveBeenCalledWith("req-uuid-1");
    });
  });

  describe("PATCH /:id (update)", () => {
    it("should update an environment request when user is owner", async () => {
      const updateDto: UpdateEnvironmentRequestDto = {
        description: "Updated description",
      };
      envService.findOne.mockResolvedValue(mockEnvRequest);
      envService.update.mockResolvedValue({
        ...mockEnvRequest,
        description: "Updated description",
      });

      const result = await controller.update(
        "req-uuid-1",
        mockRequest as any,
        updateDto,
      );

      expect(result.description).toBe("Updated description");
      expect(envService.update).toHaveBeenCalledWith("req-uuid-1", updateDto);
    });

    it("should update an environment request when user is admin but not owner", async () => {
      const updateDto: UpdateEnvironmentRequestDto = {
        description: "Admin update",
      };
      const adminReq = {
        user: {
          userId: "admin-uuid-1",
          username: "admin",
          roles: ["admin"],
        },
      };
      envService.findOne.mockResolvedValue(mockEnvRequest);
      envService.update.mockResolvedValue({
        ...mockEnvRequest,
        description: "Admin update",
      });

      const result = await controller.update(
        "req-uuid-1",
        adminReq as any,
        updateDto,
      );

      expect(result.description).toBe("Admin update");
    });

    it("should throw ForbiddenException when user is not owner and not admin", async () => {
      const otherUserReq = {
        user: {
          userId: "other-user-uuid",
          username: "other",
          roles: ["user"],
        },
      };
      envService.findOne.mockResolvedValue(mockEnvRequest);

      await expect(
        controller.update("req-uuid-1", otherUserReq as any, {
          description: "nope",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should remove an environment request", async () => {
      envService.remove.mockResolvedValue(undefined);

      const result = await controller.remove("req-uuid-1");

      expect(result).toBeUndefined();
      expect(envService.remove).toHaveBeenCalledWith("req-uuid-1");
    });
  });

  describe("POST /:id/approve", () => {
    it("should approve an environment request", async () => {
      const approved = {
        ...mockEnvRequest,
        status: EnvironmentRequestStatus.ACTIVE,
        reviewedBy: "user-uuid-1",
        statusMessage: "Approved",
      };
      envService.approve.mockResolvedValue(approved);

      const result = await controller.approve(
        "req-uuid-1",
        mockRequest as any,
        { comment: "Approved" },
      );

      expect(result.status).toBe(EnvironmentRequestStatus.ACTIVE);
      expect(envService.approve).toHaveBeenCalledWith(
        "req-uuid-1",
        "user-uuid-1",
        "Approved",
      );
    });

    it("should approve without comment", async () => {
      const approved = {
        ...mockEnvRequest,
        status: EnvironmentRequestStatus.ACTIVE,
      };
      envService.approve.mockResolvedValue(approved);

      await controller.approve("req-uuid-1", mockRequest as any, {});

      expect(envService.approve).toHaveBeenCalledWith(
        "req-uuid-1",
        "user-uuid-1",
        undefined,
      );
    });
  });

  describe("POST /:id/reject", () => {
    it("should reject an environment request", async () => {
      const rejected = {
        ...mockEnvRequest,
        status: EnvironmentRequestStatus.REJECTED,
        reviewedBy: "user-uuid-1",
        statusMessage: "Not appropriate",
      };
      envService.reject.mockResolvedValue(rejected);

      const result = await controller.reject("req-uuid-1", mockRequest as any, {
        comment: "Not appropriate",
      });

      expect(result.status).toBe(EnvironmentRequestStatus.REJECTED);
      expect(envService.reject).toHaveBeenCalledWith(
        "req-uuid-1",
        "user-uuid-1",
        "Not appropriate",
      );
    });

    it("should reject without comment", async () => {
      const rejected = {
        ...mockEnvRequest,
        status: EnvironmentRequestStatus.REJECTED,
      };
      envService.reject.mockResolvedValue(rejected);

      await controller.reject("req-uuid-1", mockRequest as any, {});

      expect(envService.reject).toHaveBeenCalledWith(
        "req-uuid-1",
        "user-uuid-1",
        undefined,
      );
    });
  });

  describe("POST /:id/expire", () => {
    it("should expire an environment request", async () => {
      const expired = {
        ...mockEnvRequest,
        status: EnvironmentRequestStatus.EXPIRED,
      };
      envService.expire.mockResolvedValue(expired);

      const result = await controller.expire("req-uuid-1");

      expect(result.status).toBe(EnvironmentRequestStatus.EXPIRED);
      expect(envService.expire).toHaveBeenCalledWith("req-uuid-1");
    });
  });
});
