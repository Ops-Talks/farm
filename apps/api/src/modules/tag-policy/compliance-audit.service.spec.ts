import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { ComplianceAuditService } from "./compliance-audit.service";
import { TagPolicyService } from "./tag-policy.service";

describe("ComplianceAuditService", () => {
  let service: ComplianceAuditService;
  let mockQueue: { add: jest.Mock };
  let mockTagPolicyService: { findAllOrgIds: jest.Mock };

  beforeEach(async () => {
    mockQueue = { add: jest.fn().mockResolvedValue({ id: "job-1" }) };
    mockTagPolicyService = {
      findAllOrgIds: jest.fn().mockResolvedValue(["org-1", "org-2"]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAuditService,
        {
          provide: getQueueToken(QUEUE_NAMES.COMPLIANCE_AUDIT),
          useValue: mockQueue,
        },
        { provide: TagPolicyService, useValue: mockTagPolicyService },
      ],
    }).compile();

    service = module.get<ComplianceAuditService>(ComplianceAuditService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("scheduleAudit", () => {
    it("should add a standard-priority job to the queue", async () => {
      await service.scheduleAudit("org-uuid-1");

      expect(mockQueue.add).toHaveBeenCalledWith(
        "compliance-audit",
        { orgId: "org-uuid-1" },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it("should not include priority 1 for scheduled audits", async () => {
      await service.scheduleAudit("org-uuid-1");

      const callArgs = mockQueue.add.mock.calls[0] as unknown[];
      const opts = callArgs[2] as Record<string, unknown>;
      expect(opts.priority).toBeUndefined();
    });
  });

  describe("triggerAudit", () => {
    it("should add a high-priority job to the queue", async () => {
      await service.triggerAudit("org-uuid-1");

      expect(mockQueue.add).toHaveBeenCalledWith(
        "compliance-audit",
        { orgId: "org-uuid-1" },
        expect.objectContaining({ priority: 1, attempts: 3 }),
      );
    });
  });

  describe("runScheduledAudits", () => {
    it("should schedule an audit for each org returned by TagPolicyService", async () => {
      await service.runScheduledAudits();

      expect(mockTagPolicyService.findAllOrgIds).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        "compliance-audit",
        { orgId: "org-1" },
        expect.any(Object),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        "compliance-audit",
        { orgId: "org-2" },
        expect.any(Object),
      );
    });

    it("should do nothing when no orgs have policies", async () => {
      mockTagPolicyService.findAllOrgIds.mockResolvedValue([]);
      await service.runScheduledAudits();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("without audit queue (queue is null)", () => {
    let serviceNoQueue: ComplianceAuditService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ComplianceAuditService,
          // Queue is intentionally omitted to exercise the `?.add` null path.
          { provide: TagPolicyService, useValue: mockTagPolicyService },
        ],
      }).compile();

      serviceNoQueue = module.get<ComplianceAuditService>(
        ComplianceAuditService,
      );
    });

    it("should not throw when scheduleAudit is called without a queue", async () => {
      await expect(
        serviceNoQueue.scheduleAudit("org-1"),
      ).resolves.not.toThrow();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should not throw when triggerAudit is called without a queue", async () => {
      await expect(serviceNoQueue.triggerAudit("org-1")).resolves.not.toThrow();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should run scheduled audits without throwing when queue is absent", async () => {
      await expect(serviceNoQueue.runScheduledAudits()).resolves.not.toThrow();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
