import { Test, TestingModule } from "@nestjs/testing";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { PluginManagerController } from "./plugin-manager.controller";
import { PluginManagerService } from "./plugin-manager.service";
import { PluginInstanceService } from "./services/plugin-instance.service";
import { PluginRegistryService } from "./services/plugin-registry.service";

describe("PluginManagerController", () => {
  let controller: PluginManagerController;
  let service: PluginManagerService;

  const mockPlugins = [
    {
      name: "core-catalog",
      version: "1.0.0",
      description: "Software catalog management",
    },
    {
      name: "core-auth",
      version: "1.0.0",
      description: "Authentication and authorization",
    },
  ];

  const mockMenuItems = [
    {
      label: "Catalog",
      path: "/catalog",
      order: 10,
      pluginName: "core-catalog",
    },
    { label: "Docs", path: "/docs", order: 20, pluginName: "core-docs" },
  ];

  const mockRoutes = [
    { path: "/api/catalog", method: "GET", description: "List components" },
  ];

  const mockPluginInstanceService = {
    install: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    uninstall: jest.fn(),
    getHealth: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockPluginRegistryService = {
    search: jest.fn().mockResolvedValue([]),
    publish: jest.fn(),
    findOne: jest.fn(),
    getVersions: jest.fn().mockResolvedValue([]),
    incrementInstallCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [PluginManagerController],
      providers: [
        {
          provide: PluginManagerService,
          useValue: {
            getPlugins: jest.fn().mockReturnValue(mockPlugins),
            getMenuItems: jest.fn().mockReturnValue(mockMenuItems),
            getRoutes: jest.fn().mockReturnValue(mockRoutes),
            scanDirectory: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("./plugins") },
        },
        {
          provide: PluginInstanceService,
          useValue: mockPluginInstanceService,
        },
        {
          provide: PluginRegistryService,
          useValue: mockPluginRegistryService,
        },
      ],
    }).compile();

    controller = module.get<PluginManagerController>(PluginManagerController);
    service = module.get<PluginManagerService>(PluginManagerService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return all registered plugins", () => {
    const result = controller.getPlugins();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("core-catalog");
    expect(service.getPlugins).toHaveBeenCalled();
  });

  it("should return all menu items", () => {
    const result = controller.getMenuItems();
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Catalog");
    expect(service.getMenuItems).toHaveBeenCalled();
  });

  it("should return all route contributions", () => {
    const result = controller.getRoutes();
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe("GET");
    expect(service.getRoutes).toHaveBeenCalled();
  });

  it("should call scanDirectory on reload", () => {
    const result = controller.reloadPlugins();
    expect(result).toEqual([]);
    expect(service.scanDirectory).toHaveBeenCalledWith("./plugins");
  });

  it("should use './plugins' fallback when configService returns undefined for plugins.dir", async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [PluginManagerController],
      providers: [
        {
          provide: PluginManagerService,
          useValue: {
            ...service,
            scanDirectory: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: PluginInstanceService,
          useValue: mockPluginInstanceService,
        },
        {
          provide: PluginRegistryService,
          useValue: mockPluginRegistryService,
        },
      ],
    }).compile();

    const ctrl = module.get<PluginManagerController>(PluginManagerController);
    const svc = module.get<PluginManagerService>(PluginManagerService);

    ctrl.reloadPlugins();

    expect(svc.scanDirectory).toHaveBeenCalledWith("./plugins");
  });

  describe("Registry endpoints", () => {
    it("should search the registry", async () => {
      const result = await controller.searchRegistry({ q: "slack" });
      expect(mockPluginRegistryService.search).toHaveBeenCalledWith(
        "slack",
        undefined,
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it("should list all plugin instances", async () => {
      const result = await controller.listInstances({});
      expect(mockPluginInstanceService.findAll).toHaveBeenCalledWith(undefined);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
