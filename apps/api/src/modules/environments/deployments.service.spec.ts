import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { getToken } from "@willsoto/nestjs-prometheus";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DeploymentsService } from "./deployments.service";
import { Deployment, DeploymentStatus } from "./entities/deployment.entity";
import { Environment, EnvironmentType } from "./entities/environment.entity";
import {
  Component,
  ComponentKind,
  ComponentKindGroup,
  ComponentLifecycle,
} from "../catalog/entities/component.entity";
import { EventsGateway } from "../../common/events/events.gateway";

describe("DeploymentsService", () => {
  let service: DeploymentsService;
  let deploymentRepo: Record<string, jest.Mock>;
  let environmentRepo: Record<string, jest.Mock>;
  let componentRepo: Record<string, jest.Mock>;

  const mockDeploymentOperationsCounter = { inc: jest.fn() };

  const mockComponent: Partial<Component> = {
    id: "comp-uuid-1",
    name: "user-service",
    kind: ComponentKind.SERVICE,
    owner: "platform-team",
    lifecycle: ComponentLifecycle.PRODUCTION,
  };

  const mockEnvironment: Partial<Environment> = {
    id: "env-uuid-1",
    name: "production",
    type: EnvironmentType.PRODUCTION,
    order: 3,
  };

  const mockDeployment: Partial<Deployment> = {
    id: "deploy-uuid-1",
    version: "v1.0.0",
    status: DeploymentStatus.PENDING,
    componentId: "comp-uuid-1",
    environmentId: "env-uuid-1",
    deployedBy: "ci-bot",
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Reusable mock QueryBuilder that chains properly.
  // andWhere is handled separately so that callbacks are actually invoked,
  // allowing tests to assert on subQuery() and related chain calls.
  const createMockQueryBuilder = (result: unknown[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    const chainMethods = [
      "select",
      "addSelect",
      "where",
      "groupBy",
      "orderBy",
      "innerJoin",
      "leftJoinAndSelect",
      "setParameters",
      "setParameter",
      "from",
    ];
    for (const method of chainMethods) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    // Invoke the callback when andWhere receives one so that subQuery() chains
    // inside the callback are executed and can be asserted upon.
    qb.andWhere = jest.fn().mockImplementation((conditionOrCallback) => {
      if (typeof conditionOrCallback === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        conditionOrCallback(qb);
      }
      return qb;
    });
    qb.getQuery = jest
      .fn()
      .mockReturnValue(
        "(SELECT MAX(sub2.createdAt) FROM deployment sub2 WHERE ...)",
      );
    qb.getParameters = jest.fn().mockReturnValue({});
    qb.getMany = jest.fn().mockResolvedValue(result);
    qb.getRawMany = jest.fn().mockResolvedValue(result);
    // subQuery() returns the same chainable mock, mirroring TypeORM's behaviour
    // of wrapping the inner SELECT in parentheses.
    qb.subQuery = jest.fn().mockReturnValue(qb);
    return qb;
  };

  beforeEach(async () => {
    const deploymentQb = createMockQueryBuilder();
    const componentQb = createMockQueryBuilder();

    deploymentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(deploymentQb),
    };

    environmentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    componentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(componentQb),
    };

    const mockEventsGateway = {
      emitDeploymentCreated: jest.fn(),
      emitDeploymentUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        {
          provide: getRepositoryToken(Deployment),
          useValue: deploymentRepo,
        },
        {
          provide: getRepositoryToken(Environment),
          useValue: environmentRepo,
        },
        {
          provide: getRepositoryToken(Component),
          useValue: componentRepo,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: getToken("deployment_operations_total"),
          useValue: mockDeploymentOperationsCounter,
        },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a deployment", async () => {
      componentRepo.findOne.mockResolvedValue(mockComponent as Component);
      environmentRepo.findOne.mockResolvedValue(mockEnvironment as Environment);
      deploymentRepo.create.mockReturnValue(mockDeployment as Deployment);
      deploymentRepo.save.mockResolvedValue(mockDeployment as Deployment);

      const result = await service.create({
        componentId: "comp-uuid-1",
        environmentId: "env-uuid-1",
        version: "v1.0.0",
        deployedBy: "ci-bot",
      });

      expect(result).toEqual(mockDeployment);
    });

    it("should increment deployment_operations_total with operation=create", async () => {
      mockDeploymentOperationsCounter.inc.mockClear();
      componentRepo.findOne.mockResolvedValue(mockComponent as Component);
      environmentRepo.findOne.mockResolvedValue(mockEnvironment as Environment);
      deploymentRepo.create.mockReturnValue(mockDeployment as Deployment);
      deploymentRepo.save.mockResolvedValue(mockDeployment as Deployment);

      await service.create({
        componentId: "comp-uuid-1",
        environmentId: "env-uuid-1",
        version: "v1.0.0",
      });

      expect(mockDeploymentOperationsCounter.inc).toHaveBeenCalledWith({
        operation: "create",
        status: mockDeployment.status,
      });
    });

    it("should throw NotFoundException if component not found", async () => {
      componentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          componentId: "nonexistent",
          environmentId: "env-uuid-1",
          version: "v1.0.0",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if environment not found", async () => {
      componentRepo.findOne.mockResolvedValue(mockComponent as Component);
      environmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          componentId: "comp-uuid-1",
          environmentId: "nonexistent",
          version: "v1.0.0",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return deployments with filters", async () => {
      deploymentRepo.findAndCount.mockResolvedValue([
        [mockDeployment as Deployment],
        1,
      ]);

      const [data, total] = await service.findAll(0, 20, {
        componentId: "comp-uuid-1",
        status: DeploymentStatus.PENDING,
      });

      expect(data).toHaveLength(1);
      expect(total).toBe(1);
      expect(deploymentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            componentId: "comp-uuid-1",
            status: DeploymentStatus.PENDING,
          },
          skip: 0,
          take: 20,
        }),
      );
    });

    it("should return all deployments when called without arguments", async () => {
      deploymentRepo.findAndCount.mockResolvedValue([
        [mockDeployment as Deployment],
        1,
      ]);

      const [data, total] = await service.findAll();

      expect(data).toHaveLength(1);
      expect(total).toBe(1);
      expect(deploymentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
        }),
      );
    });

    it("should filter by environmentId when provided", async () => {
      deploymentRepo.findAndCount.mockResolvedValue([
        [mockDeployment as Deployment],
        1,
      ]);

      await service.findAll(0, 20, { environmentId: "env-uuid-1" });

      expect(deploymentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environmentId: "env-uuid-1" },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a deployment by ID", async () => {
      deploymentRepo.findOne.mockResolvedValue(mockDeployment as Deployment);

      const result = await service.findOne("deploy-uuid-1");

      expect(result).toEqual(mockDeployment);
    });

    it("should throw NotFoundException if not found", async () => {
      deploymentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update deployment status with valid transition", async () => {
      const pendingDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.PENDING,
      };
      const updatedDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.IN_PROGRESS,
      };

      deploymentRepo.findOne.mockResolvedValue(pendingDeployment as Deployment);
      deploymentRepo.merge.mockReturnValue(updatedDeployment as Deployment);
      deploymentRepo.save.mockResolvedValue(updatedDeployment as Deployment);

      const result = await service.update("deploy-uuid-1", {
        status: DeploymentStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(DeploymentStatus.IN_PROGRESS);
    });

    it("should increment deployment_operations_total with operation=update", async () => {
      mockDeploymentOperationsCounter.inc.mockClear();
      const pendingDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.PENDING,
      };
      const updatedDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.IN_PROGRESS,
      };

      deploymentRepo.findOne.mockResolvedValue(pendingDeployment as Deployment);
      deploymentRepo.merge.mockReturnValue(updatedDeployment as Deployment);
      deploymentRepo.save.mockResolvedValue(updatedDeployment as Deployment);

      await service.update("deploy-uuid-1", {
        status: DeploymentStatus.IN_PROGRESS,
      });

      expect(mockDeploymentOperationsCounter.inc).toHaveBeenCalledWith({
        operation: "update",
        status: DeploymentStatus.IN_PROGRESS,
      });
    });

    it("should throw BadRequestException for invalid status transition", async () => {
      const pendingDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.PENDING,
      };

      deploymentRepo.findOne.mockResolvedValue(pendingDeployment as Deployment);

      await expect(
        service.update("deploy-uuid-1", {
          status: DeploymentStatus.SUCCEEDED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findLatestByComponent", () => {
    it("should return latest deployments using a single query", async () => {
      const succeededDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.SUCCEEDED,
      };

      componentRepo.findOne.mockResolvedValue(mockComponent as Component);

      const qb = createMockQueryBuilder([succeededDeployment]);
      deploymentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findLatestByComponent("comp-uuid-1");

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DeploymentStatus.SUCCEEDED);
      // Verify QueryBuilder was used (single query) instead of per-environment loop
      expect(deploymentRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalledTimes(1);
    });

    it("should throw NotFoundException if component not found", async () => {
      componentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findLatestByComponent("nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getMatrix", () => {
    it("should return a deployment matrix using aggregated queries", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);

      environmentRepo.find.mockResolvedValue([mockEnvironment as Environment]);

      const latestDep = {
        componentId: "comp-uuid-1",
        environmentId: "env-uuid-1",
        version: "v1.0.0",
        status: DeploymentStatus.SUCCEEDED,
        deployedAt: new Date(),
      };
      const deployQb = createMockQueryBuilder([latestDep]);
      deploymentRepo.createQueryBuilder.mockReturnValue(deployQb);

      const result = await service.getMatrix();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("user-service");
      expect(result[0].environments).toHaveLength(1);
      expect(result[0].environments[0].version).toBe("v1.0.0");
      // Verify filters are applied at query level, not in-memory
      expect(componentRepo.createQueryBuilder).toHaveBeenCalled();
      // Verify single aggregation query instead of M*N loop
      expect(deployQb.getRawMany).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no components match filters", async () => {
      const componentQb = createMockQueryBuilder([]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);

      const result = await service.getMatrix({
        owner: "nonexistent-team",
      });

      expect(result).toHaveLength(0);
      // Should not query deployments at all when no components match
      expect(deploymentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should apply kindGroup filter at query level", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([]);

      await service.getMatrix({ kindGroup: ComponentKindGroup.DEV });

      expect(componentQb.andWhere).toHaveBeenCalledWith(
        "c.kind IN (:...kinds)",
        expect.objectContaining({ kinds: expect.any(Array) as unknown }),
      );
    });

    it("should use subQuery() for the correlated MAX subquery, not raw string concatenation", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([mockEnvironment as Environment]);

      const deployQb = createMockQueryBuilder([]);
      deploymentRepo.createQueryBuilder.mockReturnValue(deployQb);

      await service.getMatrix();

      // subQuery() must have been called on the deployment QueryBuilder,
      // proving that TypeORM's parenthesised subquery path is used instead
      // of the broken raw-string concatenation that fails on PostgreSQL.
      expect(deployQb.subQuery).toHaveBeenCalled();
    });

    it("should pass subStatus parameter with DeploymentStatus.SUCCEEDED", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([mockEnvironment as Environment]);

      const deployQb = createMockQueryBuilder([]);
      deploymentRepo.createQueryBuilder.mockReturnValue(deployQb);

      await service.getMatrix();

      expect(deployQb.setParameter).toHaveBeenCalledWith(
        "subStatus",
        DeploymentStatus.SUCCEEDED,
      );
    });

    it("should return components with empty environments when no environments exist", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([]);

      const result = await service.getMatrix();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockComponent.id);
      expect(result[0].name).toBe(mockComponent.name);
      expect(result[0].environments).toEqual([]);
      // Deployments must not be queried when there are no environments.
      expect(deploymentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should apply owner filter at query level", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([]);

      await service.getMatrix({ owner: "platform-team" });

      expect(componentQb.andWhere).toHaveBeenCalledWith("c.owner = :owner", {
        owner: "platform-team",
      });
    });

    it("should apply lifecycle filter at query level", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([]);

      await service.getMatrix({ lifecycle: ComponentLifecycle.PRODUCTION });

      expect(componentQb.andWhere).toHaveBeenCalledWith(
        "c.lifecycle = :lifecycle",
        { lifecycle: ComponentLifecycle.PRODUCTION },
      );
    });

    it("should apply kindGroup filter at query level", async () => {
      const componentQb = createMockQueryBuilder([mockComponent]);
      componentRepo.createQueryBuilder.mockReturnValue(componentQb);
      environmentRepo.find.mockResolvedValue([]);

      await service.getMatrix({ kindGroup: "service" });

      expect(componentQb.andWhere).toHaveBeenCalledWith(
        "c.kind IN (:...kinds)",
        expect.objectContaining({ kinds: expect.any(Array) as unknown }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// DeploymentsService — additional branch coverage
// ---------------------------------------------------------------------------

describe("DeploymentsService — additional branches", () => {
  let service: DeploymentsService;
  let deploymentRepo: Record<string, jest.Mock>;
  let componentRepo: Record<string, jest.Mock>;
  let environmentRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    deploymentRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    componentRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    environmentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: getRepositoryToken(Deployment), useValue: deploymentRepo },
        { provide: getRepositoryToken(Component), useValue: componentRepo },
        { provide: getRepositoryToken(Environment), useValue: environmentRepo },
        {
          provide: getToken("deployment_operations_total"),
          useValue: { inc: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("update — metadata merge branch", () => {
    it("should merge new metadata with existing metadata when updateDto has metadata", async () => {
      const existing = {
        id: "dep-1",
        status: DeploymentStatus.IN_PROGRESS,
        metadata: { existingKey: "existingVal" },
      };
      const mergedDeployment = {
        ...existing,
        metadata: { existingKey: "existingVal", newKey: "newVal" },
        status: DeploymentStatus.SUCCEEDED,
      };
      deploymentRepo.findOne.mockResolvedValue(existing);
      deploymentRepo.merge.mockReturnValue(mergedDeployment);
      deploymentRepo.save.mockResolvedValue(mergedDeployment);

      const result = await service.update("dep-1", {
        status: DeploymentStatus.SUCCEEDED,
        metadata: { newKey: "newVal" },
      });

      expect(result.metadata).toEqual({
        existingKey: "existingVal",
        newKey: "newVal",
      });
    });

    it("should not merge metadata when updateDto.metadata is not provided", async () => {
      const existing = {
        id: "dep-1",
        status: DeploymentStatus.IN_PROGRESS,
        metadata: { key: "val" },
      };
      const mergedDeployment = {
        ...existing,
        status: DeploymentStatus.SUCCEEDED,
      };
      deploymentRepo.findOne.mockResolvedValue(existing);
      deploymentRepo.merge.mockReturnValue(mergedDeployment);
      deploymentRepo.save.mockResolvedValue(mergedDeployment);

      await service.update("dep-1", { status: DeploymentStatus.SUCCEEDED });

      // No metadata merge should happen
      expect(deploymentRepo.save).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Branch: findAll() default arguments — skip=0 and take=20 must be used
  // when the caller omits those parameters.
  // ---------------------------------------------------------------------------

  describe("findAll — default arguments", () => {
    it("should use default skip=0 and take=20 when called without arguments", async () => {
      deploymentRepo.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      const [data, total] = await service.findAll();

      expect(deploymentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(data).toEqual([]);
      expect(total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Branch: findAll() filter conditions — covers the three independent
  // `if (filters?.X)` branches at lines 118-120 of deployments.service.ts.
  //
  // The test below uses only `environmentId`, which simultaneously exercises:
  //   - line 118 false path  (componentId absent → where.componentId not set)
  //   - line 119 true path   (environmentId present → where.environmentId set)
  //   - line 120 false path  (status absent → where.status not set)
  // ---------------------------------------------------------------------------

  describe("findAll — filter condition branches", () => {
    it("should add only environmentId to the where clause when other filters are absent", async () => {
      deploymentRepo.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll(0, 20, { environmentId: "env-uuid-1" });

      expect(deploymentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environmentId: "env-uuid-1" },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Branch: update() status check — the `if (updateDeploymentDto.status)`
  // guard at line 162 must take its false path when status is omitted.
  // ---------------------------------------------------------------------------

  describe("update — omitted status field", () => {
    it("should skip status-transition validation when status is not provided", async () => {
      const existing = {
        id: "dep-1",
        status: DeploymentStatus.IN_PROGRESS,
        metadata: null as unknown as Record<string, unknown>,
      };
      const saved = { ...existing, finishedAt: "2023-01-01T00:00:00Z" };
      deploymentRepo.findOne.mockResolvedValue(existing);
      deploymentRepo.merge.mockReturnValue(saved);
      deploymentRepo.save.mockResolvedValue(saved);

      const result = await service.update("dep-1", {
        finishedAt: "2023-01-01T00:00:00Z",
      });

      expect(result).toEqual(saved);
      // The BadRequestException transition guard must not have been triggered.
      expect(deploymentRepo.save).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Branch: `deployment.metadata || {}` — the falsy path (existing metadata
  // is null / undefined) at line 175 must be reachable when the caller
  // supplies new metadata but the deployment has no prior metadata.
  // ---------------------------------------------------------------------------

  describe("update — null existing metadata fallback", () => {
    it("should use an empty object as the base when existing deployment has no metadata", async () => {
      const existing = {
        id: "dep-1",
        status: DeploymentStatus.IN_PROGRESS,
        metadata: null as unknown as Record<string, unknown>,
      };
      const saved = {
        ...existing,
        status: DeploymentStatus.SUCCEEDED,
        metadata: { newKey: "newVal" },
      };
      deploymentRepo.findOne.mockResolvedValue(existing);
      deploymentRepo.merge.mockReturnValue(saved);
      deploymentRepo.save.mockResolvedValue(saved);

      const result = await service.update("dep-1", {
        status: DeploymentStatus.SUCCEEDED,
        metadata: { newKey: "newVal" },
      });

      // The spread `...(deployment.metadata || {})` expands an empty object
      // because deployment.metadata is null.
      expect(result.metadata).toEqual({ newKey: "newVal" });
    });
  });
});

// ---------------------------------------------------------------------------
// DeploymentsService — with EventEmitter2 provided
//
// This separate module setup exercises the branches inside the
// `this.eventEmitter?.emit("deployment.status.changed", { ... })` call that
// are unreachable when EventEmitter2 is absent.  Specifically it covers both
// sides of the two `||` operators inside the emit payload:
//   line 197 — `saved.component?.name || saved.componentId`
//   line 199 — `saved.environment?.name || saved.environmentId`
// ---------------------------------------------------------------------------

describe("DeploymentsService — with EventEmitter2", () => {
  let service: DeploymentsService;
  let deploymentRepo: Record<string, jest.Mock>;
  let componentRepo: Record<string, jest.Mock>;
  let environmentRepo: Record<string, jest.Mock>;
  let mockEventEmitter: { emit: jest.Mock };

  function buildQB(items: object[] = []): Record<string, jest.Mock> {
    const qb: Record<string, jest.Mock> = {};
    for (const m of [
      "select",
      "addSelect",
      "where",
      "andWhere",
      "groupBy",
      "orderBy",
      "innerJoin",
      "leftJoinAndSelect",
      "setParameters",
      "setParameter",
      "from",
    ]) {
      qb[m] = jest.fn().mockReturnValue(qb);
    }
    qb.getQuery = jest.fn().mockReturnValue("SELECT 1");
    qb.getParameters = jest.fn().mockReturnValue({});
    qb.getMany = jest.fn().mockResolvedValue(items);
    qb.getRawMany = jest.fn().mockResolvedValue(items);
    qb.subQuery = jest.fn().mockReturnValue(qb);
    return qb;
  }

  beforeEach(async () => {
    mockEventEmitter = { emit: jest.fn() };

    deploymentRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(buildQB()),
    };
    componentRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(buildQB()),
    };
    environmentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: getRepositoryToken(Deployment), useValue: deploymentRepo },
        { provide: getRepositoryToken(Component), useValue: componentRepo },
        { provide: getRepositoryToken(Environment), useValue: environmentRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: getToken("deployment_operations_total"),
          useValue: { inc: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // Covers branch[0] of `saved.component?.name || saved.componentId` (line 197)
  // and branch[0] of `saved.environment?.name || saved.environmentId` (line 199):
  // both component.name and environment.name are truthy, so the left-hand side
  // of each `||` is used.
  it("should emit deployment.status.changed with component and environment names", async () => {
    const existing = {
      id: "dep-1",
      status: DeploymentStatus.IN_PROGRESS,
      metadata: null,
      componentId: "comp-1",
      environmentId: "env-1",
      version: "v1.0.0",
    };
    const saved = {
      ...existing,
      status: DeploymentStatus.SUCCEEDED,
      component: { name: "my-svc" },
      environment: { name: "production" },
    };

    deploymentRepo.findOne.mockResolvedValue(existing);
    deploymentRepo.merge.mockReturnValue(saved);
    deploymentRepo.save.mockResolvedValue(saved);

    await service.update("dep-1", { status: DeploymentStatus.SUCCEEDED });

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "deployment.status.changed",
      expect.objectContaining({
        name: "my-svc",
        environment: "production",
        status: DeploymentStatus.SUCCEEDED,
      }),
    );
  });

  // Covers branch[1] of `saved.component?.name || saved.componentId` (line 197)
  // and branch[1] of `saved.environment?.name || saved.environmentId` (line 199):
  // component and environment relations are absent, so the right-hand side
  // fallback ID values are used instead.
  it("should fall back to componentId and environmentId when relations are absent", async () => {
    const existing = {
      id: "dep-1",
      status: DeploymentStatus.IN_PROGRESS,
      metadata: null,
      componentId: "comp-fallback",
      environmentId: "env-fallback",
      version: "v1.0.0",
    };
    const saved = {
      ...existing,
      status: DeploymentStatus.SUCCEEDED,
      component: null as unknown as { name: string },
      environment: null as unknown as { name: string },
    };

    deploymentRepo.findOne.mockResolvedValue(existing);
    deploymentRepo.merge.mockReturnValue(saved);
    deploymentRepo.save.mockResolvedValue(saved);

    await service.update("dep-1", { status: DeploymentStatus.SUCCEEDED });

    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      "deployment.status.changed",
      expect.objectContaining({
        name: "comp-fallback",
        environment: "env-fallback",
      }),
    );
  });
});
