import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";
import { ComplianceAuditProcessor } from "./compliance-audit.processor";
import { TagPolicyService } from "./tag-policy.service";
import { CloudResourceService } from "../cloud/cloud-resource.service";
import { EventsGateway } from "../../common/events/events.gateway";
import { FarmEvent } from "../../common/events/events.interfaces";
import { TagPolicy } from "./entities/tag-policy.entity";
import { CloudResource } from "../cloud/interfaces/cloud-resource.interface";
import { ComplianceAuditJobData } from "./compliance-audit.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildJob(data: ComplianceAuditJobData): Job<ComplianceAuditJobData> {
  return { data } as Job<ComplianceAuditJobData>;
}

function buildPolicy(overrides: Partial<TagPolicy> = {}): TagPolicy {
  return {
    id: "policy-uuid-1",
    orgId: "org-uuid-1",
    resourceType: "ecs-service",
    requiredKeys: ["env", "team"],
    severity: "warning",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildResource(overrides: Partial<CloudResource> = {}): CloudResource {
  return {
    provider: "aws",
    resourceId: "arn:aws:ecs:us-east-1:123:service/my-svc",
    resourceType: "ecs-service",
    name: "my-svc",
    region: "us-east-1",
    tags: { env: "prod", team: "platform" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ComplianceAuditProcessor", () => {
  let processor: ComplianceAuditProcessor;
  let mockTagPolicyService: {
    findAll: jest.Mock;
    upsertViolation: jest.Mock;
  };
  let mockCloudResourceService: { discoverAll: jest.Mock };
  let mockEventsGateway: { server: { emit: jest.Mock } };

  beforeEach(async () => {
    mockTagPolicyService = {
      findAll: jest.fn(),
      upsertViolation: jest.fn().mockResolvedValue(undefined),
    };

    mockCloudResourceService = {
      discoverAll: jest.fn().mockResolvedValue([]),
    };

    mockEventsGateway = {
      server: { emit: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAuditProcessor,
        { provide: TagPolicyService, useValue: mockTagPolicyService },
        { provide: CloudResourceService, useValue: mockCloudResourceService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    processor = module.get<ComplianceAuditProcessor>(ComplianceAuditProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // No policies
  // ---------------------------------------------------------------------------

  describe("when no policies exist for the org", () => {
    it("should return early with zero totals", async () => {
      mockTagPolicyService.findAll.mockResolvedValue([]);
      const result = await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(result).toMatchObject({
        orgId: "org-uuid-1",
        total: 0,
        violations: 0,
      });
      expect(mockCloudResourceService.discoverAll).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Compliant resources
  // ---------------------------------------------------------------------------

  describe("when all resources are compliant", () => {
    it("should call upsertViolation with empty missingKeys and emit event", async () => {
      const policy = buildPolicy();
      const resource = buildResource({
        tags: { env: "prod", team: "platform" },
      });

      mockTagPolicyService.findAll.mockResolvedValue([policy]);
      mockCloudResourceService.discoverAll.mockResolvedValue([resource]);

      const result = await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledWith(
        expect.objectContaining({ missingKeys: [] }),
      );
      expect(result.violations).toBe(0);
      expect(result.total).toBe(1);
      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        FarmEvent.COMPLIANCE_AUDIT_COMPLETED,
        expect.objectContaining({ orgId: "org-uuid-1" }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Non-compliant resources
  // ---------------------------------------------------------------------------

  describe("when a resource is missing required tags", () => {
    it("should call upsertViolation with the missing keys", async () => {
      const policy = buildPolicy({ requiredKeys: ["env", "team", "owner"] });
      const resource = buildResource({ tags: { env: "prod" } });

      mockTagPolicyService.findAll.mockResolvedValue([policy]);
      mockCloudResourceService.discoverAll.mockResolvedValue([resource]);

      const result = await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          missingKeys: expect.arrayContaining(["team", "owner"]),
        }),
      );
      expect(result.violations).toBe(1);
    });

    it("should count multiple non-compliant resources correctly", async () => {
      const policy = buildPolicy();
      const resources = [
        buildResource({ resourceId: "res-1", tags: {} }),
        buildResource({ resourceId: "res-2", tags: { env: "prod" } }),
        buildResource({
          resourceId: "res-3",
          tags: { env: "prod", team: "platform" },
        }),
      ];

      mockTagPolicyService.findAll.mockResolvedValue([policy]);
      mockCloudResourceService.discoverAll.mockResolvedValue(resources);

      const result = await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(result.total).toBe(3);
      expect(result.violations).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Policy matching
  // ---------------------------------------------------------------------------

  describe("policy matching", () => {
    it("should apply wildcard '*' policies to all resource types", async () => {
      const wildcardPolicy = buildPolicy({
        resourceType: "*",
        requiredKeys: ["owner"],
      });
      const resource = buildResource({ resourceType: "lambda", tags: {} });

      mockTagPolicyService.findAll.mockResolvedValue([wildcardPolicy]);
      mockCloudResourceService.discoverAll.mockResolvedValue([resource]);

      await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledWith(
        expect.objectContaining({ missingKeys: ["owner"] }),
      );
    });

    it("should skip resources whose type does not match any policy", async () => {
      const policy = buildPolicy({ resourceType: "ecs-service" });
      const resource = buildResource({ resourceType: "lambda" });

      mockTagPolicyService.findAll.mockResolvedValue([policy]);
      mockCloudResourceService.discoverAll.mockResolvedValue([resource]);

      const result = await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(mockTagPolicyService.upsertViolation).not.toHaveBeenCalled();
      expect(result.violations).toBe(0);
    });

    it("should merge requiredKeys from multiple matching policies", async () => {
      const policyA = buildPolicy({ requiredKeys: ["env"] });
      const policyB = buildPolicy({
        id: "policy-uuid-2",
        resourceType: "ecs-service",
        requiredKeys: ["team"],
      });
      const resource = buildResource({ tags: {} });

      mockTagPolicyService.findAll.mockResolvedValue([policyA, policyB]);
      mockCloudResourceService.discoverAll.mockResolvedValue([resource]);

      await processor.process(buildJob({ orgId: "org-uuid-1" }));

      expect(mockTagPolicyService.upsertViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          missingKeys: expect.arrayContaining(["env", "team"]),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Optional dependencies
  // ---------------------------------------------------------------------------

  describe("when CloudResourceService is not available", () => {
    it("should process without crashing and return empty results", async () => {
      const processorWithoutCloud = new ComplianceAuditProcessor(
        mockTagPolicyService as unknown as TagPolicyService,
        undefined,
        mockEventsGateway as unknown as EventsGateway,
      );

      mockTagPolicyService.findAll.mockResolvedValue([buildPolicy()]);

      const result = await processorWithoutCloud.process(
        buildJob({ orgId: "org-uuid-1" }),
      );

      expect(result.total).toBe(0);
      expect(result.violations).toBe(0);
    });
  });

  describe("when EventsGateway is not available", () => {
    it("should complete without emitting events", async () => {
      const processorWithoutGateway = new ComplianceAuditProcessor(
        mockTagPolicyService as unknown as TagPolicyService,
        mockCloudResourceService as unknown as CloudResourceService,
        undefined,
      );

      mockTagPolicyService.findAll.mockResolvedValue([buildPolicy()]);
      mockCloudResourceService.discoverAll.mockResolvedValue([]);

      await expect(
        processorWithoutGateway.process(buildJob({ orgId: "org-uuid-1" })),
      ).resolves.not.toThrow();
    });
  });
});
