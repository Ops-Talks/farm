import { Test, TestingModule } from "@nestjs/testing";
import { CacheModule } from "@nestjs/cache-manager";
import { PluginManagerController } from "./plugin-manager.controller";
import { PluginManagerService } from "./plugin-manager.service";

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
          },
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
});
