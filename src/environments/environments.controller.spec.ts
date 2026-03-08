import { Test, TestingModule } from "@nestjs/testing";
import { EnvironmentsController } from "./environments.controller";
import { EnvironmentsService } from "./environments.service";
import { EnvironmentType } from "./entities/environment.entity";

describe("EnvironmentsController", () => {
  let controller: EnvironmentsController;
  let service: EnvironmentsService;

  const mockEnvironment = {
    id: "env-uuid-1",
    name: "production",
    description: "Production environment",
    type: EnvironmentType.PRODUCTION,
    order: 3,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnvironmentsController],
      providers: [
        {
          provide: EnvironmentsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockEnvironment),
            findAll: jest.fn().mockResolvedValue([mockEnvironment]),
            findOne: jest.fn().mockResolvedValue(mockEnvironment),
            update: jest.fn().mockResolvedValue(mockEnvironment),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<EnvironmentsController>(EnvironmentsController);
    service = module.get<EnvironmentsService>(EnvironmentsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create an environment", async () => {
    const result = await controller.create({
      name: "production",
      type: EnvironmentType.PRODUCTION,
    });
    expect(result).toEqual(mockEnvironment);
    expect(service.create).toHaveBeenCalled();
  });

  it("should return all environments", async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalled();
  });

  it("should return one environment", async () => {
    const result = await controller.findOne("env-uuid-1");
    expect(result).toEqual(mockEnvironment);
    expect(service.findOne).toHaveBeenCalledWith("env-uuid-1");
  });

  it("should update an environment", async () => {
    const result = await controller.update("env-uuid-1", {
      description: "Updated",
    });
    expect(result).toEqual(mockEnvironment);
    expect(service.update).toHaveBeenCalled();
  });

  it("should remove an environment", async () => {
    await controller.remove("env-uuid-1");
    expect(service.remove).toHaveBeenCalledWith("env-uuid-1");
  });
});
