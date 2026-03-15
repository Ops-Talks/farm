import { PluginManagerService } from "./plugin-manager.service";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs");

describe("PluginManagerService", () => {
  let service: PluginManagerService;

  beforeEach(() => {
    service = new PluginManagerService();
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should register a plugin", () => {
    service.register({
      name: "test-plugin",
      version: "1.0.0",
      description: "A test plugin",
    });

    const plugins = service.getPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("test-plugin");
  });

  it("should return all registered plugins", () => {
    service.register({
      name: "plugin-a",
      version: "1.0.0",
      description: "Plugin A",
    });
    service.register({
      name: "plugin-b",
      version: "2.0.0",
      description: "Plugin B",
    });

    const plugins = service.getPlugins();
    expect(plugins).toHaveLength(2);
  });

  it("should get a specific plugin by name", () => {
    service.register({
      name: "my-plugin",
      version: "1.0.0",
      description: "My Plugin",
    });

    const plugin = service.getPlugin("my-plugin");
    expect(plugin).toBeDefined();
    expect(plugin?.name).toBe("my-plugin");
    expect(plugin?.version).toBe("1.0.0");
  });

  it("should return undefined for unknown plugin", () => {
    const plugin = service.getPlugin("nonexistent");
    expect(plugin).toBeUndefined();
  });

  it("should overwrite existing plugin on re-register", () => {
    service.register({
      name: "my-plugin",
      version: "1.0.0",
      description: "Version 1",
    });
    service.register({
      name: "my-plugin",
      version: "2.0.0",
      description: "Version 2",
    });

    const plugins = service.getPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].version).toBe("2.0.0");
  });

  describe("menu items", () => {
    it("should register and return menu items sorted by order", () => {
      service.registerMenuItems([
        { label: "Docs", path: "/docs", order: 20, pluginName: "core-docs" },
        {
          label: "Catalog",
          path: "/catalog",
          order: 10,
          pluginName: "core-catalog",
        },
      ]);

      const items = service.getMenuItems();
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe("Catalog");
      expect(items[1].label).toBe("Docs");
    });

    it("should return empty array when no menu items registered", () => {
      expect(service.getMenuItems()).toHaveLength(0);
    });
  });

  describe("routes", () => {
    it("should register and return route contributions", () => {
      service.registerRoutes([
        { path: "/api/ci", method: "GET", description: "List CI runs" },
      ]);

      const routes = service.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/api/ci");
    });
  });

  describe("scanDirectory", () => {
    it("should return empty array if directory does not exist", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const manifests = service.scanDirectory("/nonexistent");
      expect(manifests).toHaveLength(0);
    });

    it("should discover plugins with valid manifests", () => {
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p === "/plugins") return true;
        if (p === path.join("/plugins", "my-plugin", "plugin.json"))
          return true;
        return false;
      });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: "my-plugin", isDirectory: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: "my-plugin",
          version: "1.0.0",
          description: "Test",
          main: "./index.js",
        }),
      );

      const manifests = service.scanDirectory("/plugins");
      expect(manifests).toHaveLength(1);
      expect(manifests[0].name).toBe("my-plugin");
    });

    it("should skip directories without plugin.json", () => {
      (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p === "/plugins") return true;
        return false;
      });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: "no-manifest", isDirectory: () => true },
      ]);

      const manifests = service.scanDirectory("/plugins");
      expect(manifests).toHaveLength(0);
    });

    it("should skip manifests missing required fields", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: "bad-plugin", isDirectory: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ name: "bad-plugin" }),
      );

      const manifests = service.scanDirectory("/plugins");
      expect(manifests).toHaveLength(0);
    });
  });
});
