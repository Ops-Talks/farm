import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DeploymentsService } from "./deployments.service";
import { Deployment, DeploymentStatus } from "./entities/deployment.entity";
import { Environment, EnvironmentType } from "./entities/environment.entity";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../catalog/entities/component.entity";
import { EventsGateway } from "../../common/events/events.gateway";

describe("DeploymentsService", () => {
  let service: DeploymentsService;
  let deploymentRepo: Record<string, jest.Mock>;
  let environmentRepo: Record<string, jest.Mock>;
  let componentRepo: Record<string, jest.Mock>;

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

  // Reusable mock QueryBuilder that chains properly
  const createMockQueryBuilder = (result: unknown[] = []) => {
    const qb: Record<string, jest.Mock> = {};
    const chainMethods = [
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
    ];
    for (const method of chainMethods) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getQuery = jest.fn().mockReturnValue("SUBQUERY");
    qb.getParameters = jest.fn().mockReturnValue({});
    qb.getMany = jest.fn().mockResolvedValue(result);
    qb.getRawMany = jest.fn().mockResolvedValue(result);
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

      await service.getMatrix({ kindGroup: "development" as never });

      expect(componentQb.andWhere).toHaveBeenCalledWith(
        "c.kind IN (:...kinds)",
        expect.objectContaining({ kinds: expect.any(Array) as unknown }),
      );
    });
  });
});
