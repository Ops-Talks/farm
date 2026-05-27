import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AnalyticsService } from "../analytics.service";
import {
  Component,
  ComponentLifecycle,
} from "../../catalog/entities/component.entity";
import {
  Deployment,
  DeploymentStatus,
} from "../../environments/entities/deployment.entity";
import { AuditLog } from "../../audit-log/entities/audit-log.entity";

/**
 * Returns a Jest mock SelectQueryBuilder whose terminal methods resolve to
 * the provided values.
 */
function createMockQb(overrides: Record<string, unknown> = {}) {
  const qb: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  return qb;
}

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  let componentQbFactory: jest.Mock;
  let deploymentQbFactory: jest.Mock;
  let auditLogQbFactory: jest.Mock;

  let mockComponentRepo: Record<string, jest.Mock>;
  let mockDeploymentRepo: Record<string, jest.Mock>;
  let mockAuditLogRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    // Default query builders — tests override per-case as needed
    componentQbFactory = jest.fn(() => createMockQb());
    deploymentQbFactory = jest.fn(() => createMockQb());
    auditLogQbFactory = jest.fn(() => createMockQb());

    mockComponentRepo = {
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: componentQbFactory,
    };

    mockDeploymentRepo = {
      createQueryBuilder: deploymentQbFactory,
    };

    mockAuditLogRepo = {
      createQueryBuilder: auditLogQbFactory,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Component),
          useValue: mockComponentRepo,
        },
        {
          provide: getRepositoryToken(Deployment),
          useValue: mockDeploymentRepo,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepo,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getCatalogAnalytics
  // ---------------------------------------------------------------------------

  describe("getCatalogAnalytics", () => {
    it("returns safe zero values when there are no components", async () => {
      mockComponentRepo.count.mockResolvedValue(0);

      // Ownership count query
      componentQbFactory.mockImplementation(() =>
        createMockQb({
          getCount: jest.fn().mockResolvedValue(0),
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getCatalogAnalytics();

      expect(result.ownershipCoverage.total).toBe(0);
      expect(result.ownershipCoverage.withOwner).toBe(0);
      expect(result.ownershipCoverage.withoutOwner).toBe(0);
      expect(result.ownershipCoverage.coveragePercent).toBe(0);
      expect(result.unownedComponents).toEqual([]);
    });

    it("correctly computes ownership coverage percent to 1 decimal", async () => {
      // The service calls createQueryBuilder 5 times for getCatalogAnalytics:
      //   1. total count        (getCount)
      //   2. withOwner count    (getCount)
      //   3. lifecycle dist.    (getRawMany)
      //   4. kind dist.         (getRawMany)
      //   5. unowned components (getMany)
      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(3) }),
        createMockQb({ getCount: jest.fn().mockResolvedValue(2) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      ];
      let callIndex = 0;
      componentQbFactory.mockImplementation(() => calls[callIndex++]);

      const result = await service.getCatalogAnalytics();

      expect(result.ownershipCoverage.total).toBe(3);
      expect(result.ownershipCoverage.withOwner).toBe(2);
      expect(result.ownershipCoverage.withoutOwner).toBe(1);
      expect(result.ownershipCoverage.coveragePercent).toBe(66.7);
    });

    it("includes all ComponentLifecycle values in lifecycleDistribution even if count is 0", async () => {
      const lifecycleRows = [{ lifecycle: "production", count: "5" }];

      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(5) }),
        createMockQb({ getCount: jest.fn().mockResolvedValue(5) }),
        createMockQb({
          getRawMany: jest.fn().mockResolvedValue(lifecycleRows),
        }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      ];
      let callIndex = 0;
      componentQbFactory.mockImplementation(() => calls[callIndex++]);

      const result = await service.getCatalogAnalytics();

      const allLifecycles = Object.values(ComponentLifecycle);
      expect(result.lifecycleDistribution).toHaveLength(allLifecycles.length);

      const productionEntry = result.lifecycleDistribution.find(
        (l) => l.lifecycle === "production",
      );
      expect(productionEntry?.count).toBe(5);

      const experimentalEntry = result.lifecycleDistribution.find(
        (l) => l.lifecycle === "experimental",
      );
      expect(experimentalEntry?.count).toBe(0);
    });

    it("only includes kinds with at least 1 component in kindDistribution", async () => {
      const kindRows = [
        { kind: "service", count: "3" },
        { kind: "library", count: "1" },
      ];

      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(4) }),
        createMockQb({ getCount: jest.fn().mockResolvedValue(4) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue(kindRows) }),
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      ];
      let callIndex = 0;
      componentQbFactory.mockImplementation(() => calls[callIndex++]);

      const result = await service.getCatalogAnalytics();

      expect(result.kindDistribution).toHaveLength(2);
      expect(result.kindDistribution[0]).toEqual({ kind: "service", count: 3 });
      expect(result.kindDistribution[1]).toEqual({ kind: "library", count: 1 });
    });

    it("returns unowned components with id, name, kind (limit 50)", async () => {
      const unownedComponents = [
        { id: "uuid-1", name: "svc-a", kind: "service" },
        { id: "uuid-2", name: "lib-b", kind: "library" },
      ];

      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(2) }),
        createMockQb({ getCount: jest.fn().mockResolvedValue(0) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({
          getMany: jest.fn().mockResolvedValue(unownedComponents),
        }),
      ];
      let callIndex = 0;
      componentQbFactory.mockImplementation(() => calls[callIndex++]);

      const result = await service.getCatalogAnalytics();

      expect(result.unownedComponents).toHaveLength(2);
      expect(result.unownedComponents[0]).toEqual({
        id: "uuid-1",
        name: "svc-a",
        kind: "service",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getDoraMetrics
  // ---------------------------------------------------------------------------

  describe("getDoraMetrics", () => {
    it("returns safe zero values when there are no deployments", async () => {
      deploymentQbFactory.mockImplementation(() =>
        createMockQb({
          getCount: jest.fn().mockResolvedValue(0),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      );

      const result = await service.getDoraMetrics(30);

      expect(result.periodDays).toBe(30);
      expect(result.deploymentFrequency.total).toBe(0);
      expect(result.deploymentFrequency.deploymentsPerDay).toBe(0);
      expect(result.changeFailureRate.rate).toBe(0);
      expect(result.changeFailureRate.total).toBe(0);
      expect(result.meanTimeToRecovery.avgHours).toBe(0);
      expect(result.meanTimeToRecovery.samples).toBe(0);
      expect(result.leadTimeForChanges.avgHours).toBe(0);
      expect(result.leadTimeForChanges.samples).toBe(0);
    });

    it("correctly computes deployment frequency rounded to 2 decimals", async () => {
      // 100 succeeded deployments over 30 days = 3.33 per day
      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(100) }), // succeeded
        createMockQb({ getCount: jest.fn().mockResolvedValue(0) }), // failed
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }), // failed deps for MTTR
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }), // lead time
      ];
      let i = 0;
      deploymentQbFactory.mockImplementation(() => calls[i++]);

      const result = await service.getDoraMetrics(30);

      expect(result.deploymentFrequency.deploymentsPerDay).toBe(3.33);
      expect(result.deploymentFrequency.total).toBe(100);
    });

    it("correctly computes change failure rate rounded to 1 decimal", async () => {
      // 10 failed, 90 succeeded → CFR = 10/100 * 100 = 10.0%
      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(90) }), // succeeded
        createMockQb({ getCount: jest.fn().mockResolvedValue(10) }), // failed
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }), // MTTR
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }), // lead time
      ];
      let i = 0;
      deploymentQbFactory.mockImplementation(() => calls[i++]);

      const result = await service.getDoraMetrics(30);

      expect(result.changeFailureRate.rate).toBe(10.0);
      expect(result.changeFailureRate.failed).toBe(10);
      expect(result.changeFailureRate.total).toBe(100);
    });

    it("correctly computes MTTR when a recovery deployment follows a failure", async () => {
      const failedAt = new Date("2024-01-01T10:00:00Z");
      const recoveredAt = new Date("2024-01-01T12:00:00Z"); // 2 hours later

      const failedDeployment = {
        id: "d-failed",
        componentId: "comp-1",
        environmentId: "env-1",
        createdAt: failedAt,
        status: DeploymentStatus.FAILED,
      } as Deployment;

      const succeededDeployment = {
        id: "d-succeeded",
        componentId: "comp-1",
        environmentId: "env-1",
        createdAt: recoveredAt,
        status: DeploymentStatus.SUCCEEDED,
      } as Deployment;

      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(1) }), // succeeded count
        createMockQb({ getCount: jest.fn().mockResolvedValue(1) }), // failed count
        createMockQb({
          getMany: jest.fn().mockResolvedValue([failedDeployment]),
        }), // failed deps
        createMockQb({
          getOne: jest.fn().mockResolvedValue(succeededDeployment),
        }), // next succeeded
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }), // lead time
      ];
      let i = 0;
      deploymentQbFactory.mockImplementation(() => calls[i++]);

      const result = await service.getDoraMetrics(30);

      expect(result.meanTimeToRecovery.avgHours).toBe(2.0);
      expect(result.meanTimeToRecovery.samples).toBe(1);
    });

    it("returns zero MTTR when no recovery deployment is found for a failure", async () => {
      const failedDeployment = {
        id: "d-failed",
        componentId: "comp-1",
        environmentId: "env-1",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        status: DeploymentStatus.FAILED,
      } as Deployment;

      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(0) }),
        createMockQb({ getCount: jest.fn().mockResolvedValue(1) }),
        createMockQb({
          getMany: jest.fn().mockResolvedValue([failedDeployment]),
        }),
        createMockQb({ getOne: jest.fn().mockResolvedValue(null) }),
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      ];
      let i = 0;
      deploymentQbFactory.mockImplementation(() => calls[i++]);

      const result = await service.getDoraMetrics(30);

      expect(result.meanTimeToRecovery.avgHours).toBe(0);
      expect(result.meanTimeToRecovery.samples).toBe(0);
    });

    it("correctly computes lead time for changes rounded to 1 decimal", async () => {
      const startedAt = new Date("2024-01-01T10:00:00Z");
      const finishedAt = new Date("2024-01-01T10:30:00Z"); // 0.5 hours

      const dep = {
        startedAt,
        finishedAt,
        status: DeploymentStatus.SUCCEEDED,
      } as Deployment;

      const calls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(1) }),
        createMockQb({ getCount: jest.fn().mockResolvedValue(0) }),
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getMany: jest.fn().mockResolvedValue([dep]) }),
      ];
      let i = 0;
      deploymentQbFactory.mockImplementation(() => calls[i++]);

      const result = await service.getDoraMetrics(30);

      expect(result.leadTimeForChanges.avgHours).toBe(0.5);
      expect(result.leadTimeForChanges.samples).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getUsageAnalytics
  // ---------------------------------------------------------------------------

  describe("getUsageAnalytics", () => {
    it("returns safe zero values when there are no audit events", async () => {
      auditLogQbFactory.mockImplementation(() =>
        createMockQb({
          getCount: jest.fn().mockResolvedValue(0),
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      );
      componentQbFactory.mockImplementation(() =>
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      );

      const result = await service.getUsageAnalytics(30);

      expect(result.periodDays).toBe(30);
      expect(result.totalAuditEvents).toBe(0);
      expect(result.topComponents).toEqual([]);
      expect(result.activeUsers).toEqual([]);
      expect(result.actionBreakdown).toEqual([]);
    });

    it("correctly maps top components with component names from the catalog", async () => {
      const topComponentRows = [
        { componentId: "comp-uuid-1", accessCount: "25" },
        { componentId: "comp-uuid-2", accessCount: "10" },
      ];

      const auditCalls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(100) }),
        createMockQb({
          getRawMany: jest.fn().mockResolvedValue(topComponentRows),
        }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }), // active users
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }), // action breakdown
      ];
      let ai = 0;
      auditLogQbFactory.mockImplementation(() => auditCalls[ai++]);

      const components = [
        { id: "comp-uuid-1", name: "payment-service" },
        { id: "comp-uuid-2", name: "auth-service" },
      ];
      componentQbFactory.mockImplementation(() =>
        createMockQb({ getMany: jest.fn().mockResolvedValue(components) }),
      );

      const result = await service.getUsageAnalytics(30);

      expect(result.topComponents).toHaveLength(2);
      expect(result.topComponents[0]).toEqual({
        componentId: "comp-uuid-1",
        componentName: "payment-service",
        accessCount: 25,
      });
      expect(result.topComponents[1]).toEqual({
        componentId: "comp-uuid-2",
        componentName: "auth-service",
        accessCount: 10,
      });
    });

    it("returns empty componentName when component has been deleted", async () => {
      const topComponentRows = [
        { componentId: "deleted-uuid", accessCount: "5" },
      ];

      const auditCalls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(5) }),
        createMockQb({
          getRawMany: jest.fn().mockResolvedValue(topComponentRows),
        }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }),
      ];
      let ai = 0;
      auditLogQbFactory.mockImplementation(() => auditCalls[ai++]);

      // Component no longer exists in catalog
      componentQbFactory.mockImplementation(() =>
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      );

      const result = await service.getUsageAnalytics(30);

      expect(result.topComponents[0].componentName).toBe("");
    });

    it("correctly maps active users and action breakdown", async () => {
      const activeUserRows = [
        { actorId: "user-1", actorUsername: "alice", actionCount: "30" },
        { actorId: "user-2", actorUsername: "bob", actionCount: "15" },
      ];

      const actionBreakdownRows = [
        { action: "CREATE", count: "20" },
        { action: "DELETE", count: "10" },
      ];

      const auditCalls = [
        createMockQb({ getCount: jest.fn().mockResolvedValue(35) }),
        createMockQb({ getRawMany: jest.fn().mockResolvedValue([]) }), // top components
        createMockQb({
          getRawMany: jest.fn().mockResolvedValue(activeUserRows),
        }),
        createMockQb({
          getRawMany: jest.fn().mockResolvedValue(actionBreakdownRows),
        }),
      ];
      let ai = 0;
      auditLogQbFactory.mockImplementation(() => auditCalls[ai++]);
      componentQbFactory.mockImplementation(() =>
        createMockQb({ getMany: jest.fn().mockResolvedValue([]) }),
      );

      const result = await service.getUsageAnalytics(30);

      expect(result.activeUsers).toHaveLength(2);
      expect(result.activeUsers[0]).toEqual({
        actorId: "user-1",
        actorUsername: "alice",
        actionCount: 30,
      });

      expect(result.actionBreakdown).toHaveLength(2);
      expect(result.actionBreakdown[0]).toEqual({
        action: "CREATE",
        count: 20,
      });
    });
  });
});
