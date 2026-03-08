import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DeploymentsService } from "./deployments.service";
import { Deployment, DeploymentStatus } from "./entities/deployment.entity";
import { Environment, EnvironmentType } from "./entities/environment.entity";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../catalog/entities/component.entity";

describe("DeploymentsService", () => {
  let service: DeploymentsService;
  let deploymentRepo: Repository<Deployment>;
  let environmentRepo: Repository<Environment>;
  let componentRepo: Repository<Component>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        {
          provide: getRepositoryToken(Deployment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            merge: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Environment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Component),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
    deploymentRepo = module.get<Repository<Deployment>>(
      getRepositoryToken(Deployment),
    );
    environmentRepo = module.get<Repository<Environment>>(
      getRepositoryToken(Environment),
    );
    componentRepo = module.get<Repository<Component>>(
      getRepositoryToken(Component),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a deployment", async () => {
      jest
        .spyOn(componentRepo, "findOne")
        .mockResolvedValue(mockComponent as Component);
      jest
        .spyOn(environmentRepo, "findOne")
        .mockResolvedValue(mockEnvironment as Environment);
      jest
        .spyOn(deploymentRepo, "create")
        .mockReturnValue(mockDeployment as Deployment);
      jest
        .spyOn(deploymentRepo, "save")
        .mockResolvedValue(mockDeployment as Deployment);

      const result = await service.create({
        componentId: "comp-uuid-1",
        environmentId: "env-uuid-1",
        version: "v1.0.0",
        deployedBy: "ci-bot",
      });

      expect(result).toEqual(mockDeployment);
    });

    it("should throw NotFoundException if component not found", async () => {
      jest.spyOn(componentRepo, "findOne").mockResolvedValue(null);

      await expect(
        service.create({
          componentId: "nonexistent",
          environmentId: "env-uuid-1",
          version: "v1.0.0",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if environment not found", async () => {
      jest
        .spyOn(componentRepo, "findOne")
        .mockResolvedValue(mockComponent as Component);
      jest.spyOn(environmentRepo, "findOne").mockResolvedValue(null);

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
      jest
        .spyOn(deploymentRepo, "find")
        .mockResolvedValue([mockDeployment as Deployment]);

      const result = await service.findAll({
        componentId: "comp-uuid-1",
        status: DeploymentStatus.PENDING,
      });

      expect(result).toHaveLength(1);
      expect(deploymentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            componentId: "comp-uuid-1",
            status: DeploymentStatus.PENDING,
          },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a deployment by ID", async () => {
      jest
        .spyOn(deploymentRepo, "findOne")
        .mockResolvedValue(mockDeployment as Deployment);

      const result = await service.findOne("deploy-uuid-1");

      expect(result).toEqual(mockDeployment);
    });

    it("should throw NotFoundException if not found", async () => {
      jest.spyOn(deploymentRepo, "findOne").mockResolvedValue(null);

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

      jest
        .spyOn(deploymentRepo, "findOne")
        .mockResolvedValue(pendingDeployment as Deployment);
      jest
        .spyOn(deploymentRepo, "merge")
        .mockReturnValue(updatedDeployment as Deployment);
      jest
        .spyOn(deploymentRepo, "save")
        .mockResolvedValue(updatedDeployment as Deployment);

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

      jest
        .spyOn(deploymentRepo, "findOne")
        .mockResolvedValue(pendingDeployment as Deployment);

      await expect(
        service.update("deploy-uuid-1", {
          status: DeploymentStatus.SUCCEEDED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findLatestByComponent", () => {
    it("should return latest deployments per environment", async () => {
      jest
        .spyOn(componentRepo, "findOne")
        .mockResolvedValue(mockComponent as Component);
      jest
        .spyOn(environmentRepo, "find")
        .mockResolvedValue([mockEnvironment as Environment]);

      const succeededDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.SUCCEEDED,
      };
      jest
        .spyOn(deploymentRepo, "findOne")
        .mockResolvedValue(succeededDeployment as Deployment);

      const result = await service.findLatestByComponent("comp-uuid-1");

      expect(result).toHaveLength(1);
    });

    it("should throw NotFoundException if component not found", async () => {
      jest.spyOn(componentRepo, "findOne").mockResolvedValue(null);

      await expect(
        service.findLatestByComponent("nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getMatrix", () => {
    it("should return a deployment matrix", async () => {
      jest
        .spyOn(componentRepo, "find")
        .mockResolvedValue([mockComponent as Component]);
      jest
        .spyOn(environmentRepo, "find")
        .mockResolvedValue([mockEnvironment as Environment]);

      const succeededDeployment = {
        ...mockDeployment,
        status: DeploymentStatus.SUCCEEDED,
        version: "v1.0.0",
      };
      jest
        .spyOn(deploymentRepo, "findOne")
        .mockResolvedValue(succeededDeployment as Deployment);

      const result = await service.getMatrix();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("user-service");
      expect(result[0].environments).toHaveLength(1);
      expect(result[0].environments[0].version).toBe("v1.0.0");
    });
  });
});
