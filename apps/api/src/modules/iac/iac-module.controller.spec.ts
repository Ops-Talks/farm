import { Test, TestingModule } from "@nestjs/testing";
import { IacModuleController } from "./iac-module.controller";
import { IacModuleService } from "./iac-module.service";
import { IacModuleSyncService } from "./iac-module-sync.service";
import {
  IacModule as IacModuleEntity,
  IacProvider,
} from "./entities/iac-module.entity";

describe("IacModuleController", () => {
  let controller: IacModuleController;
  let moduleService: Record<string, jest.Mock>;
  let syncService: Record<string, jest.Mock>;

  const mockModule: IacModuleEntity = {
    id: "module-uuid-1",
    name: "terraform-aws-vpc",
    provider: IacProvider.AWS,
    sourceRepoUrl: "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    description: "Creates a VPC on AWS",
    engine: null,
    latestVersion: "v5.1.2",
    componentId: null,
    versions: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    moduleService = {
      findAll: jest.fn().mockResolvedValue([mockModule]),
      create: jest.fn().mockResolvedValue(mockModule),
      findOne: jest.fn().mockResolvedValue(mockModule),
      findVersions: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(mockModule),
      remove: jest.fn().mockResolvedValue(undefined),
      linkComponent: jest
        .fn()
        .mockResolvedValue({ ...mockModule, componentId: "comp-1" }),
      unlinkComponent: jest
        .fn()
        .mockResolvedValue({ ...mockModule, componentId: null }),
      getModulesByComponent: jest.fn().mockResolvedValue([mockModule]),
    };

    syncService = {
      sync: jest
        .fn()
        .mockResolvedValue({ newVersions: 2, latestVersion: "v5.1.2" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IacModuleController],
      providers: [
        { provide: IacModuleService, useValue: moduleService },
        { provide: IacModuleSyncService, useValue: syncService },
      ],
    }).compile();

    controller = module.get<IacModuleController>(IacModuleController);
  });

  afterEach(() => jest.clearAllMocks());

  it("findAll delegates to service", async () => {
    const result = await controller.findAll();
    expect(moduleService.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("findAll passes search and provider filters", async () => {
    await controller.findAll("vpc", IacProvider.AWS);
    expect(moduleService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "vpc",
        provider: IacProvider.AWS,
      }),
    );
  });

  it("create delegates to service", async () => {
    const dto = {
      name: "terraform-aws-vpc",
      provider: IacProvider.AWS,
      sourceRepoUrl:
        "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    };
    const result = await controller.create(dto);
    expect(moduleService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockModule);
  });

  it("findOne delegates to service", async () => {
    const result = await controller.findOne("module-uuid-1");
    expect(moduleService.findOne).toHaveBeenCalledWith("module-uuid-1");
    expect(result).toEqual(mockModule);
  });

  it("findVersions delegates to service", async () => {
    await controller.findVersions("module-uuid-1");
    expect(moduleService.findVersions).toHaveBeenCalledWith("module-uuid-1");
  });

  it("update delegates to service", async () => {
    await controller.update("module-uuid-1", { description: "New desc" });
    expect(moduleService.update).toHaveBeenCalledWith("module-uuid-1", {
      description: "New desc",
    });
  });

  it("remove delegates to service", async () => {
    await controller.remove("module-uuid-1");
    expect(moduleService.remove).toHaveBeenCalledWith("module-uuid-1");
  });

  it("sync resolves the module and calls syncService", async () => {
    const result = await controller.sync("module-uuid-1");
    expect(moduleService.findOne).toHaveBeenCalledWith("module-uuid-1");
    expect(syncService.sync).toHaveBeenCalledWith(mockModule);
    expect(result.newVersions).toBe(2);
  });

  it("linkComponent delegates to service", async () => {
    const result = await controller.linkComponent("module-uuid-1", {
      componentId: "comp-1",
    });
    expect(moduleService.linkComponent).toHaveBeenCalledWith(
      "module-uuid-1",
      "comp-1",
    );
    expect(result.componentId).toBe("comp-1");
  });

  it("unlinkComponent delegates to service", async () => {
    const result = await controller.unlinkComponent("module-uuid-1");
    expect(moduleService.unlinkComponent).toHaveBeenCalledWith("module-uuid-1");
    expect(result.componentId).toBeNull();
  });

  it("getByComponent delegates to service", async () => {
    const result = await controller.getByComponent("comp-uuid-1");
    expect(moduleService.getModulesByComponent).toHaveBeenCalledWith(
      "comp-uuid-1",
    );
    expect(result).toHaveLength(1);
  });
});
