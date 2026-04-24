import { Test, TestingModule } from "@nestjs/testing";
import { EnvironmentsController } from "./environments.controller";
import { EnvironmentsService } from "./environments.service";
import { EnvironmentType } from "./entities/environment.entity";
import { PaginatedResponseDto } from "../../common/dto";

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
            findAll: jest.fn().mockResolvedValue([[mockEnvironment], 1]),
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
    const result = await controller.create(
      {
        name: "production",
        type: EnvironmentType.PRODUCTION,
      },
      { organizationId: "org-uuid-1" },
    );
    expect(result).toEqual(mockEnvironment);
    expect(service.create).toHaveBeenCalledWith(
      { name: "production", type: EnvironmentType.PRODUCTION },
      "org-uuid-1",
    );
  });

  it("should return all environments with pagination", async () => {
    const mockReq = { organizationId: undefined };
    const result = await controller.findAll({ skip: 0, take: 20 }, mockReq);
    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(service.findAll).toHaveBeenCalledWith(0, 20, undefined);
  });

  it("should use skip=0 and take=20 defaults when query properties are undefined", async () => {
    const mockReq = { organizationId: "org-1" };
    const result = await controller.findAll(
      { skip: undefined, take: undefined },
      mockReq,
    );
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
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
