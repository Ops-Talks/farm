import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EnvironmentRequestService } from "./environment-request.service";
import {
  EnvironmentRequest,
  EnvironmentRequestStatus,
  EnvironmentType,
  EnvironmentTier,
} from "./entities/environment-request.entity";
import { CreateEnvironmentRequestDto } from "./dto/create-environment-request.dto";
import { ListEnvironmentRequestsQueryDto } from "./dto/list-environment-requests-query.dto";

describe("EnvironmentRequestService", () => {
  let service: EnvironmentRequestService;
  let repo: Record<string, jest.Mock>;

  const mockRequest: EnvironmentRequest = {
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

  const createDto: CreateEnvironmentRequestDto = {
    name: "staging-feature-x",
    description: "Staging env for feature X",
    type: EnvironmentType.EPHEMERAL,
    tier: EnvironmentTier.SMALL,
    ttlHours: 24,
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentRequestService,
        {
          provide: getRepositoryToken(EnvironmentRequest),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<EnvironmentRequestService>(EnvironmentRequestService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an environment request successfully", async () => {
      repo.create.mockReturnValue(mockRequest);
      repo.save.mockResolvedValue(mockRequest);

      const result = await service.create(createDto, "user-uuid-1");

      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        requestedBy: "user-uuid-1",
        status: EnvironmentRequestStatus.PENDING,
        organizationId: undefined,
      });
      expect(repo.save).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockRequest);
    });

    it("should use provided organizationId parameter", async () => {
      repo.create.mockReturnValue(mockRequest);
      repo.save.mockResolvedValue(mockRequest);

      await service.create(createDto, "user-uuid-1", "org-override");

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-override",
        }),
      );
    });

    it("should fall back to dto organizationId when parameter is not provided", async () => {
      const dtoWithOrg = { ...createDto, organizationId: "org-from-dto" };
      repo.create.mockReturnValue(mockRequest);
      repo.save.mockResolvedValue(mockRequest);

      await service.create(dtoWithOrg, "user-uuid-1");

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-from-dto",
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should findAll with no filters", async () => {
      repo.findAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = new ListEnvironmentRequestsQueryDto();
      const result = await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual([[mockRequest], 1]);
    });

    it("should findAll with status filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = Object.assign(new ListEnvironmentRequestsQueryDto(), {
        status: EnvironmentRequestStatus.PENDING,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { status: EnvironmentRequestStatus.PENDING },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with type filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = Object.assign(new ListEnvironmentRequestsQueryDto(), {
        type: EnvironmentType.EPHEMERAL,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { type: EnvironmentType.EPHEMERAL },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with requestedBy filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = Object.assign(new ListEnvironmentRequestsQueryDto(), {
        requestedBy: "user-uuid-1",
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { requestedBy: "user-uuid-1" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with organizationId filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = Object.assign(new ListEnvironmentRequestsQueryDto(), {
        organizationId: "org-uuid-1",
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should apply all filters and custom pagination", async () => {
      repo.findAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = Object.assign(new ListEnvironmentRequestsQueryDto(), {
        status: EnvironmentRequestStatus.ACTIVE,
        type: EnvironmentType.PERSISTENT,
        requestedBy: "user-uuid-2",
        organizationId: "org-uuid-2",
        skip: 5,
        take: 10,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {
          status: EnvironmentRequestStatus.ACTIVE,
          type: EnvironmentType.PERSISTENT,
          requestedBy: "user-uuid-2",
          organizationId: "org-uuid-2",
        },
        order: { createdAt: "DESC" },
        skip: 5,
        take: 10,
      });
    });
  });

  describe("findOne", () => {
    it("should findOne successfully", async () => {
      repo.findOne.mockResolvedValue(mockRequest);

      const result = await service.findOne("req-uuid-1");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "req-uuid-1" },
      });
      expect(result).toEqual(mockRequest);
    });

    it("should throw NotFoundException when request not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne("nonexistent")).rejects.toThrow(
        'Environment request with ID "nonexistent" not found',
      );
    });
  });

  describe("update", () => {
    it("should update a pending request successfully", async () => {
      repo.findOne.mockResolvedValue(mockRequest);
      repo.merge.mockReturnValue({
        ...mockRequest,
        description: "Updated description",
      });
      repo.save.mockResolvedValue({
        ...mockRequest,
        description: "Updated description",
      });

      const result = await service.update("req-uuid-1", {
        description: "Updated description",
      });

      expect(result.description).toBe("Updated description");
    });

    it("should throw BadRequestException when request is not in PENDING status", async () => {
      const activeRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.ACTIVE,
      };
      repo.findOne.mockResolvedValue(activeRequest);

      await expect(
        service.update("req-uuid-1", { description: "nope" }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update("req-uuid-1", { description: "nope" }),
      ).rejects.toThrow('Cannot update request in status "active"');
    });

    it("should throw NotFoundException if request to update does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { description: "nope" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a pending request", async () => {
      repo.findOne.mockResolvedValue(mockRequest);
      repo.remove.mockResolvedValue(undefined);

      await expect(service.remove("req-uuid-1")).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(mockRequest);
    });

    it("should throw BadRequestException when request is not in PENDING status", async () => {
      const approvedRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.APPROVED,
      };
      repo.findOne.mockResolvedValue(approvedRequest);

      await expect(service.remove("req-uuid-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove("req-uuid-1")).rejects.toThrow(
        'Cannot remove request in status "approved"',
      );
    });

    it("should throw NotFoundException if request to remove does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("approve", () => {
    it("should approve a pending request and set ACTIVE status via intermediate states", async () => {
      const pendingRequest = { ...mockRequest };
      repo.findOne.mockResolvedValue(pendingRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const result = await service.approve(
        "req-uuid-1",
        "reviewer-uuid-1",
        "Looks good",
      );

      expect(result.status).toBe(EnvironmentRequestStatus.ACTIVE);
      expect(result.reviewedBy).toBe("reviewer-uuid-1");
      expect(result.reviewedAt).toBeInstanceOf(Date);
      expect(result.statusMessage).toBe("Looks good");
      expect(result.provisionedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      // Three saves for state transitions: APPROVED, PROVISIONING, ACTIVE
      expect(repo.save).toHaveBeenCalledTimes(3);
    });

    it("should persist APPROVED then PROVISIONING then ACTIVE in order", async () => {
      const pendingRequest = { ...mockRequest };
      repo.findOne.mockResolvedValue(pendingRequest);
      const savedStatuses: EnvironmentRequestStatus[] = [];
      repo.save.mockImplementation((entity: EnvironmentRequest) => {
        savedStatuses.push(entity.status);
        return Promise.resolve(entity);
      });

      await service.approve("req-uuid-1", "reviewer-uuid-1");

      expect(savedStatuses).toEqual([
        EnvironmentRequestStatus.APPROVED,
        EnvironmentRequestStatus.PROVISIONING,
        EnvironmentRequestStatus.ACTIVE,
      ]);
    });

    it("should calculate expiresAt based on ttlHours for ephemeral requests", async () => {
      const pendingRequest = {
        ...mockRequest,
        type: EnvironmentType.EPHEMERAL,
        ttlHours: 48,
      };
      repo.findOne.mockResolvedValue(pendingRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const before = Date.now();
      const result = await service.approve("req-uuid-1", "reviewer-uuid-1");
      const after = Date.now();

      const expectedExpiry = pendingRequest.ttlHours * 60 * 60 * 1000;
      const actualDiff =
        result.expiresAt!.getTime() - result.provisionedAt!.getTime();
      expect(actualDiff).toBe(expectedExpiry);

      // Verify the provisioned time is reasonable
      expect(result.provisionedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.provisionedAt!.getTime()).toBeLessThanOrEqual(after);
    });

    it("should not set expiresAt for persistent requests", async () => {
      const persistentRequest = {
        ...mockRequest,
        type: EnvironmentType.PERSISTENT,
        ttlHours: 24,
        expiresAt: null,
      };
      repo.findOne.mockResolvedValue(persistentRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const result = await service.approve("req-uuid-1", "reviewer-uuid-1");

      expect(result.status).toBe(EnvironmentRequestStatus.ACTIVE);
      expect(result.expiresAt).toBeNull();
    });

    it("should not set statusMessage when comment is undefined", async () => {
      const pendingRequest = { ...mockRequest, statusMessage: null };
      repo.findOne.mockResolvedValue(pendingRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const result = await service.approve("req-uuid-1", "reviewer-uuid-1");

      expect(result.statusMessage).toBeNull();
    });

    it("should throw BadRequestException when request is not PENDING", async () => {
      const activeRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.ACTIVE,
      };
      repo.findOne.mockResolvedValue(activeRequest);

      await expect(
        service.approve("req-uuid-1", "reviewer-uuid-1"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approve("req-uuid-1", "reviewer-uuid-1"),
      ).rejects.toThrow('Cannot approve request in status "active"');
    });

    it("should throw NotFoundException if request does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.approve("nonexistent", "reviewer-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("reject", () => {
    it("should reject a pending request", async () => {
      const pendingRequest = { ...mockRequest };
      repo.findOne.mockResolvedValue(pendingRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const result = await service.reject(
        "req-uuid-1",
        "reviewer-uuid-1",
        "Not appropriate",
      );

      expect(result.status).toBe(EnvironmentRequestStatus.REJECTED);
      expect(result.reviewedBy).toBe("reviewer-uuid-1");
      expect(result.reviewedAt).toBeInstanceOf(Date);
      expect(result.statusMessage).toBe("Not appropriate");
    });

    it("should not set statusMessage when comment is undefined", async () => {
      const pendingRequest = { ...mockRequest, statusMessage: null };
      repo.findOne.mockResolvedValue(pendingRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const result = await service.reject("req-uuid-1", "reviewer-uuid-1");

      expect(result.statusMessage).toBeNull();
    });

    it("should throw BadRequestException when request is not PENDING", async () => {
      const rejectedRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.REJECTED,
      };
      repo.findOne.mockResolvedValue(rejectedRequest);

      await expect(
        service.reject("req-uuid-1", "reviewer-uuid-1"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reject("req-uuid-1", "reviewer-uuid-1"),
      ).rejects.toThrow('Cannot reject request in status "rejected"');
    });

    it("should throw NotFoundException if request does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.reject("nonexistent", "reviewer-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("expire", () => {
    it("should expire an active request", async () => {
      const activeRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.ACTIVE,
      };
      repo.findOne.mockResolvedValue(activeRequest);
      repo.save.mockImplementation((entity: EnvironmentRequest) =>
        Promise.resolve(entity),
      );

      const result = await service.expire("req-uuid-1");

      expect(result.status).toBe(EnvironmentRequestStatus.EXPIRED);
    });

    it("should throw BadRequestException when request is not ACTIVE", async () => {
      const pendingRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.PENDING,
      };
      repo.findOne.mockResolvedValue(pendingRequest);

      await expect(service.expire("req-uuid-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.expire("req-uuid-1")).rejects.toThrow(
        'Cannot expire request in status "pending"',
      );
    });

    it("should throw BadRequestException when request is EXPIRED", async () => {
      const expiredRequest = {
        ...mockRequest,
        status: EnvironmentRequestStatus.EXPIRED,
      };
      repo.findOne.mockResolvedValue(expiredRequest);

      await expect(service.expire("req-uuid-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException if request does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.expire("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
