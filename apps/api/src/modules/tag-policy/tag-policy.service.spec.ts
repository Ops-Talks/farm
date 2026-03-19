import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { IsNull, Not } from "typeorm";
import { TagPolicyService } from "./tag-policy.service";
import { TagPolicy } from "./entities/tag-policy.entity";
import { ResourceViolation } from "./entities/resource-violation.entity";
import { CreateTagPolicyDto } from "./dto/create-tag-policy.dto";
import { ListViolationsDto } from "./dto/list-violations.dto";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockPolicy: TagPolicy = {
  id: "policy-uuid-1",
  orgId: "org-uuid-1",
  resourceType: "ecs-service",
  requiredKeys: ["env", "team"],
  severity: "warning",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const mockViolation: ResourceViolation = {
  id: "violation-uuid-1",
  orgId: "org-uuid-1",
  resourceId: "arn:aws:ecs:us-east-1:123:service/my-svc",
  resourceType: "ecs-service",
  provider: "aws",
  missingKeys: ["team"],
  linkedComponentId: undefined,
  detectedAt: new Date("2024-01-01T00:00:00Z"),
  resolvedAt: undefined,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TagPolicyService", () => {
  let service: TagPolicyService;
  let policyRepo: Record<string, jest.Mock>;
  let violationRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    policyRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    violationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagPolicyService,
        { provide: getRepositoryToken(TagPolicy), useValue: policyRepo },
        {
          provide: getRepositoryToken(ResourceViolation),
          useValue: violationRepo,
        },
      ],
    }).compile();

    service = module.get<TagPolicyService>(TagPolicyService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Policy CRUD
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create and return a tag policy", async () => {
      const dto: CreateTagPolicyDto = {
        orgId: "org-uuid-1",
        resourceType: "ecs-service",
        requiredKeys: ["env", "team"],
        severity: "warning",
      };
      policyRepo.create.mockReturnValue(mockPolicy);
      policyRepo.save.mockResolvedValue(mockPolicy);

      const result = await service.create(dto);

      expect(policyRepo.create).toHaveBeenCalledWith({
        ...dto,
        severity: "warning",
      });
      expect(policyRepo.save).toHaveBeenCalledWith(mockPolicy);
      expect(result).toEqual(mockPolicy);
    });

    it("should default severity to 'warning' when not provided", async () => {
      const dto: CreateTagPolicyDto = {
        orgId: "org-uuid-1",
        resourceType: "*",
        requiredKeys: ["owner"],
      };
      policyRepo.create.mockReturnValue({ ...mockPolicy, severity: "warning" });
      policyRepo.save.mockResolvedValue({ ...mockPolicy, severity: "warning" });

      await service.create(dto);

      expect(policyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ severity: "warning" }),
      );
    });
  });

  describe("findAll", () => {
    it("should return all policies for an org", async () => {
      policyRepo.find.mockResolvedValue([mockPolicy]);
      const result = await service.findAll("org-uuid-1");
      expect(policyRepo.find).toHaveBeenCalledWith({
        where: { orgId: "org-uuid-1" },
      });
      expect(result).toEqual([mockPolicy]);
    });
  });

  describe("findOne", () => {
    it("should return the policy when found", async () => {
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      const result = await service.findOne("policy-uuid-1");
      expect(result).toEqual(mockPolicy);
    });

    it("should throw NotFoundException when not found", async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update and return the policy", async () => {
      const updated = { ...mockPolicy, requiredKeys: ["env", "team", "owner"] };
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      policyRepo.save.mockResolvedValue(updated);

      const result = await service.update("policy-uuid-1", {
        requiredKeys: ["env", "team", "owner"],
      });

      expect(policyRepo.save).toHaveBeenCalled();
      expect(result.requiredKeys).toEqual(["env", "team", "owner"]);
    });

    it("should throw NotFoundException when policy is missing", async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update("missing", { requiredKeys: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove the policy", async () => {
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      policyRepo.remove.mockResolvedValue(undefined);
      await service.remove("policy-uuid-1");
      expect(policyRepo.remove).toHaveBeenCalledWith(mockPolicy);
    });

    it("should throw NotFoundException when policy is missing", async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.remove("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Violations
  // ---------------------------------------------------------------------------

  describe("findViolations", () => {
    it("should apply orgId filter and return paginated results", async () => {
      violationRepo.findAndCount.mockResolvedValue([[mockViolation], 1]);
      const dto: ListViolationsDto = { orgId: "org-uuid-1", skip: 0, take: 20 };

      const [data, total] = await service.findViolations(dto);

      expect(violationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: "org-uuid-1" } }),
      );
      expect(data).toHaveLength(1);
      expect(total).toBe(1);
    });

    it("should filter by provider and resourceType when provided", async () => {
      violationRepo.findAndCount.mockResolvedValue([[], 0]);
      const dto: ListViolationsDto = {
        orgId: "org-uuid-1",
        provider: "aws",
        resourceType: "ecs-service",
      };

      await service.findViolations(dto);

      expect(violationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId: "org-uuid-1",
            provider: "aws",
            resourceType: "ecs-service",
          },
        }),
      );
    });

    it("should apply resolvedAt IS NULL when resolved=false", async () => {
      violationRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findViolations({ orgId: "org-uuid-1", resolved: false });

      expect(violationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ resolvedAt: IsNull() }),
        }),
      );
    });

    it("should apply resolvedAt IS NOT NULL when resolved=true", async () => {
      violationRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findViolations({ orgId: "org-uuid-1", resolved: true });

      expect(violationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ resolvedAt: Not(IsNull()) }),
        }),
      );
    });
  });

  describe("findViolation", () => {
    it("should return the violation when found", async () => {
      violationRepo.findOne.mockResolvedValue(mockViolation);
      const result = await service.findViolation("violation-uuid-1");
      expect(result).toEqual(mockViolation);
    });

    it("should throw NotFoundException when not found", async () => {
      violationRepo.findOne.mockResolvedValue(null);
      await expect(service.findViolation("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("resolveViolation", () => {
    it("should set resolvedAt and return the updated violation", async () => {
      const resolved = { ...mockViolation, resolvedAt: new Date() };
      violationRepo.findOne.mockResolvedValue({ ...mockViolation });
      violationRepo.save.mockResolvedValue(resolved);

      const result = await service.resolveViolation("violation-uuid-1");

      expect(violationRepo.save).toHaveBeenCalled();
      expect(result.resolvedAt).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // upsertViolation
  // ---------------------------------------------------------------------------

  describe("upsertViolation", () => {
    const baseData = {
      orgId: "org-uuid-1",
      resourceId: "arn:aws:ecs:us-east-1:123:service/my-svc",
      resourceType: "ecs-service",
      provider: "aws",
    };

    it("should create a new violation when none exists and keys are missing", async () => {
      violationRepo.findOne.mockResolvedValue(null);
      violationRepo.create.mockReturnValue(mockViolation);
      violationRepo.save.mockResolvedValue(mockViolation);

      await service.upsertViolation({ ...baseData, missingKeys: ["team"] });

      expect(violationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ missingKeys: ["team"] }),
      );
      expect(violationRepo.save).toHaveBeenCalled();
    });

    it("should update an existing violation with new missingKeys", async () => {
      violationRepo.findOne.mockResolvedValue({ ...mockViolation });
      violationRepo.save.mockResolvedValue({
        ...mockViolation,
        missingKeys: ["team", "owner"],
      });

      await service.upsertViolation({
        ...baseData,
        missingKeys: ["team", "owner"],
      });

      expect(violationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ missingKeys: ["team", "owner"] }),
      );
    });

    it("should resolve an existing violation when missingKeys is empty", async () => {
      violationRepo.findOne.mockResolvedValue({ ...mockViolation });
      violationRepo.save.mockResolvedValue({
        ...mockViolation,
        resolvedAt: new Date(),
      });

      await service.upsertViolation({ ...baseData, missingKeys: [] });

      expect(violationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          resolvedAt: expect.any(Date),
        }),
      );
    });

    it("should not save when resource is compliant and no existing violation", async () => {
      violationRepo.findOne.mockResolvedValue(null);

      await service.upsertViolation({ ...baseData, missingKeys: [] });

      expect(violationRepo.save).not.toHaveBeenCalled();
    });

    it("should not re-resolve an already-resolved violation", async () => {
      violationRepo.findOne.mockResolvedValue({
        ...mockViolation,
        resolvedAt: new Date("2024-01-02T00:00:00Z"),
      });

      await service.upsertViolation({ ...baseData, missingKeys: [] });

      expect(violationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getComplianceSummary
  // ---------------------------------------------------------------------------

  describe("getComplianceSummary", () => {
    it("should return 100% compliance when there are no violations", async () => {
      violationRepo.find.mockResolvedValue([]);

      const result = await service.getComplianceSummary("org-uuid-1");

      expect(result.totalResources).toBe(0);
      expect(result.totalViolations).toBe(0);
      expect(result.complianceRate).toBe(100);
      expect(result.byProvider).toEqual({});
      expect(result.byResourceType).toEqual({});
    });

    it("should correctly calculate compliance rate across providers", async () => {
      const violations: Partial<ResourceViolation>[] = [
        {
          resourceId: "res-1",
          provider: "aws",
          resourceType: "ecs-service",
          resolvedAt: undefined,
        },
        {
          resourceId: "res-2",
          provider: "aws",
          resourceType: "ecs-service",
          resolvedAt: new Date(),
        },
        {
          resourceId: "res-3",
          provider: "gcp",
          resourceType: "cloud-run",
          resolvedAt: undefined,
        },
      ];
      violationRepo.find.mockResolvedValue(violations);

      const result = await service.getComplianceSummary("org-uuid-1");

      expect(result.totalResources).toBe(3);
      expect(result.totalViolations).toBe(2);
      expect(result.complianceRate).toBeCloseTo(33.33, 1);
      expect(result.byProvider["aws"].total).toBe(2);
      expect(result.byProvider["aws"].violations).toBe(1);
      expect(result.byProvider["gcp"].total).toBe(1);
      expect(result.byProvider["gcp"].violations).toBe(1);
    });

    it("should aggregate byResourceType correctly", async () => {
      const violations: Partial<ResourceViolation>[] = [
        {
          resourceId: "res-1",
          provider: "aws",
          resourceType: "ecs-service",
          resolvedAt: undefined,
        },
        {
          resourceId: "res-2",
          provider: "aws",
          resourceType: "lambda",
          resolvedAt: undefined,
        },
      ];
      violationRepo.find.mockResolvedValue(violations);

      const result = await service.getComplianceSummary("org-uuid-1");

      expect(result.byResourceType["ecs-service"].total).toBe(1);
      expect(result.byResourceType["lambda"].total).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // findAllOrgIds
  // ---------------------------------------------------------------------------

  describe("findAllOrgIds", () => {
    it("should return distinct orgIds from the policy table", async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ orgId: "org-1" }, { orgId: "org-2" }]),
      };
      policyRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllOrgIds();

      expect(result).toEqual(["org-1", "org-2"]);
    });
  });
});
