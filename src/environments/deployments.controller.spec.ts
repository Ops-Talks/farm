import { Test, TestingModule } from "@nestjs/testing";
import { DeploymentsController } from "./deployments.controller";
import { DeploymentsService } from "./deployments.service";
import { DeploymentStatus } from "./entities/deployment.entity";
import { PaginatedResponseDto } from "../common/dto";

describe("DeploymentsController", () => {
  let controller: DeploymentsController;
  let service: DeploymentsService;

  const mockDeployment = {
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

  const mockMatrix = [
    {
      id: "comp-uuid-1",
      name: "user-service",
      kind: "service",
      environments: [
        {
          environmentId: "env-uuid-1",
          environmentName: "production",
          version: "v1.0.0",
          status: DeploymentStatus.SUCCEEDED,
          deployedAt: new Date(),
        },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeploymentsController],
      providers: [
        {
          provide: DeploymentsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockDeployment),
            findAll: jest.fn().mockResolvedValue([[mockDeployment], 1]),
            findOne: jest.fn().mockResolvedValue(mockDeployment),
            update: jest.fn().mockResolvedValue(mockDeployment),
            findLatestByComponent: jest
              .fn()
              .mockResolvedValue([mockDeployment]),
            getMatrix: jest.fn().mockResolvedValue(mockMatrix),
          },
        },
      ],
    }).compile();

    controller = module.get<DeploymentsController>(DeploymentsController);
    service = module.get<DeploymentsService>(DeploymentsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create a deployment", async () => {
    const result = await controller.create({
      componentId: "comp-uuid-1",
      environmentId: "env-uuid-1",
      version: "v1.0.0",
    });
    expect(result).toEqual(mockDeployment);
    expect(service.create).toHaveBeenCalled();
  });

  it("should return deployments with filters and pagination", async () => {
    const result = await controller.findAll({
      skip: 0,
      take: 20,
      componentId: "comp-uuid-1",
      status: DeploymentStatus.PENDING,
    });
    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(service.findAll).toHaveBeenCalledWith(0, 20, {
      componentId: "comp-uuid-1",
      environmentId: undefined,
      status: DeploymentStatus.PENDING,
    });
  });

  it("should return the deployment matrix", async () => {
    const result = await controller.getMatrix();
    expect(result).toEqual(mockMatrix);
    expect(service.getMatrix).toHaveBeenCalledWith({
      kindGroup: undefined,
      owner: undefined,
      lifecycle: undefined,
    });
  });

  it("should return latest deployments for a component", async () => {
    const result = await controller.findLatest("comp-uuid-1");
    expect(result).toHaveLength(1);
    expect(service.findLatestByComponent).toHaveBeenCalledWith("comp-uuid-1");
  });

  it("should return one deployment", async () => {
    const result = await controller.findOne("deploy-uuid-1");
    expect(result).toEqual(mockDeployment);
    expect(service.findOne).toHaveBeenCalledWith("deploy-uuid-1");
  });

  it("should update a deployment", async () => {
    const result = await controller.update("deploy-uuid-1", {
      status: DeploymentStatus.IN_PROGRESS,
    });
    expect(result).toEqual(mockDeployment);
    expect(service.update).toHaveBeenCalled();
  });
});
