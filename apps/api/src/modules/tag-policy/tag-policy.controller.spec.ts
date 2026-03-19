import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { TagPolicyController } from "./tag-policy.controller";
import { TagPolicyService } from "./tag-policy.service";
import { KyvernoExportService } from "./kyverno-export.service";
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

describe("TagPolicyController", () => {
  let controller: TagPolicyController;
  let service: jest.Mocked<TagPolicyService>;
  let kyvernoExportService: jest.Mocked<KyvernoExportService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<TagPolicyService>> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findViolations: jest.fn(),
      findViolation: jest.fn(),
      resolveViolation: jest.fn(),
      getComplianceSummary: jest.fn(),
    };

    const mockKyvernoExportService: Partial<jest.Mocked<KyvernoExportService>> =
      {
        exportTagPolicyAsClusterPolicy: jest.fn(),
      };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagPolicyController],
      providers: [
        { provide: TagPolicyService, useValue: mockService },
        { provide: KyvernoExportService, useValue: mockKyvernoExportService },
      ],
    }).compile();

    controller = module.get<TagPolicyController>(TagPolicyController);
    service = module.get(TagPolicyService);
    kyvernoExportService = module.get(KyvernoExportService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Policy endpoints
  // ---------------------------------------------------------------------------

  describe("findAll", () => {
    it("should return an array of policies for the given orgId", async () => {
      service.findAll.mockResolvedValue([mockPolicy]);
      const result = await controller.findAll("org-uuid-1");
      expect(service.findAll).toHaveBeenCalledWith("org-uuid-1");
      expect(result).toEqual([mockPolicy]);
    });
  });

  describe("create", () => {
    it("should create and return a new policy", async () => {
      const dto: CreateTagPolicyDto = {
        orgId: "org-uuid-1",
        resourceType: "ecs-service",
        requiredKeys: ["env", "team"],
        severity: "warning",
      };
      service.create.mockResolvedValue(mockPolicy);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockPolicy);
    });
  });

  describe("findOne", () => {
    it("should return a policy by id", async () => {
      service.findOne.mockResolvedValue(mockPolicy);
      const result = await controller.findOne("policy-uuid-1");
      expect(service.findOne).toHaveBeenCalledWith("policy-uuid-1");
      expect(result).toEqual(mockPolicy);
    });

    it("should propagate NotFoundException when policy is missing", async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update and return the modified policy", async () => {
      const updated = { ...mockPolicy, severity: "error" as const };
      service.update.mockResolvedValue(updated);

      const result = await controller.update("policy-uuid-1", {
        severity: "error",
      });

      expect(service.update).toHaveBeenCalledWith("policy-uuid-1", {
        severity: "error",
      });
      expect(result.severity).toBe("error");
    });
  });

  describe("remove", () => {
    it("should call service.remove and return void", async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove("policy-uuid-1");
      expect(service.remove).toHaveBeenCalledWith("policy-uuid-1");
    });
  });

  // ---------------------------------------------------------------------------
  // Violation endpoints
  // ---------------------------------------------------------------------------

  describe("listViolations", () => {
    it("should return paginated violations", async () => {
      service.findViolations.mockResolvedValue([[mockViolation], 1]);
      const dto: ListViolationsDto = { orgId: "org-uuid-1", skip: 0, take: 20 };

      const result = await controller.listViolations(dto);

      expect(service.findViolations).toHaveBeenCalledWith(dto);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getViolation", () => {
    it("should return a violation by id", async () => {
      service.findViolation.mockResolvedValue(mockViolation);
      const result = await controller.getViolation("violation-uuid-1");
      expect(result).toEqual(mockViolation);
    });

    it("should propagate NotFoundException when violation is missing", async () => {
      service.findViolation.mockRejectedValue(new NotFoundException());
      await expect(controller.getViolation("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("resolveViolation", () => {
    it("should resolve and return the updated violation", async () => {
      const resolved = { ...mockViolation, resolvedAt: new Date() };
      service.resolveViolation.mockResolvedValue(resolved);

      const result = await controller.resolveViolation("violation-uuid-1");

      expect(service.resolveViolation).toHaveBeenCalledWith("violation-uuid-1");
      expect(result.resolvedAt).toBeDefined();
    });
  });

  describe("getComplianceSummary", () => {
    it("should return the compliance summary for an org", async () => {
      const summary = {
        totalResources: 10,
        totalViolations: 2,
        complianceRate: 80,
        byProvider: { aws: { total: 10, violations: 2 } },
        byResourceType: { "ecs-service": { total: 10, violations: 2 } },
      };
      service.getComplianceSummary.mockResolvedValue(summary);

      const result = await controller.getComplianceSummary("org-uuid-1");

      expect(service.getComplianceSummary).toHaveBeenCalledWith("org-uuid-1");
      expect(result).toEqual(summary);
    });
  });

  // ---------------------------------------------------------------------------
  // Kyverno export endpoint
  // ---------------------------------------------------------------------------

  describe("exportKyverno", () => {
    it("should return yaml and filename from KyvernoExportService", async () => {
      kyvernoExportService.exportTagPolicyAsClusterPolicy.mockResolvedValue({
        yaml: "apiVersion: kyverno.io/v1\nkind: ClusterPolicy\n",
        filename: "farm-require-tags-ecs-service.yaml",
      });

      const result = await controller.exportKyverno("policy-uuid-1");

      expect(
        kyvernoExportService.exportTagPolicyAsClusterPolicy,
      ).toHaveBeenCalledWith("policy-uuid-1");
      expect(result.yaml).toContain("ClusterPolicy");
      expect(result.filename).toBe("farm-require-tags-ecs-service.yaml");
    });
  });
});
