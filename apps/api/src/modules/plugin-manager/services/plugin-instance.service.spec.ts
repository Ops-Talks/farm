import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PluginInstanceService } from "./plugin-instance.service";
import {
  PluginInstance,
  PluginStatus,
  PluginHealthStatus,
} from "../entities/plugin-instance.entity";
import { PluginRegistryEntry } from "../entities/plugin-registry-entry.entity";

describe("PluginInstanceService", () => {
  let service: PluginInstanceService;
  let instanceRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    increment: jest.Mock;
  };
  let registryRepo: {
    findOne: jest.Mock;
    increment: jest.Mock;
  };
  let validator: { validate: jest.Mock };
  let pluginManagerService: { getPlugins: jest.Mock };

  const mockManifest = {
    id: "farm-plugin-slack",
    name: "Slack",
    version: "1.0.0",
    description: "Slack notifications",
    entryPoint: "https://cdn.example.com/slack.js",
  };

  const mockRegistryEntry: Partial<PluginRegistryEntry> = {
    id: "registry-uuid",
    pluginId: "farm-plugin-slack",
    name: "Slack",
    latestVersion: "1.0.0",
    description: "Slack notifications",
    manifest: mockManifest as unknown as Record<string, unknown>,
    installCount: 5,
  };

  const mockInstance: Partial<PluginInstance> = {
    id: "instance-uuid",
    pluginId: "farm-plugin-slack",
    orgId: "org-uuid",
    version: "1.0.0",
    status: PluginStatus.ACTIVE,
    healthStatus: PluginHealthStatus.UNKNOWN,
    manifest: mockManifest as unknown as Record<string, unknown>,
  };

  beforeEach(() => {
    instanceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      increment: jest.fn(),
    };
    registryRepo = {
      findOne: jest.fn(),
      increment: jest.fn(),
    };
    validator = { validate: jest.fn() };
    pluginManagerService = { getPlugins: jest.fn() };

    service = new PluginInstanceService(
      instanceRepo as any,
      registryRepo as any,
      validator as any,
      pluginManagerService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("install", () => {
    it("should throw NotFoundException when plugin is not in registry", async () => {
      registryRepo.findOne.mockResolvedValue(null);
      await expect(
        service.install("nonexistent-plugin"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when manifest is invalid", async () => {
      registryRepo.findOne.mockResolvedValue(mockRegistryEntry);
      validator.validate.mockReturnValue({
        valid: false,
        errors: ["Required field id is missing"],
      });
      await expect(
        service.install("farm-plugin-slack"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should install and return an active instance when manifest is valid", async () => {
      registryRepo.findOne.mockResolvedValue(mockRegistryEntry);
      validator.validate.mockReturnValue({ valid: true, errors: [] });
      instanceRepo.create.mockReturnValue({ ...mockInstance, status: PluginStatus.INSTALLING });
      instanceRepo.save.mockResolvedValue({ ...mockInstance, status: PluginStatus.INSTALLING });
      instanceRepo.update.mockResolvedValue({});
      instanceRepo.findOne.mockResolvedValue({ ...mockInstance, status: PluginStatus.ACTIVE });
      registryRepo.increment.mockResolvedValue({});

      const result = await service.install("farm-plugin-slack", "org-uuid");
      expect(result.status).toBe(PluginStatus.ACTIVE);
      expect(instanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginId: "farm-plugin-slack",
          orgId: "org-uuid",
          status: PluginStatus.INSTALLING,
        }),
      );
      expect(registryRepo.increment).toHaveBeenCalledWith(
        { pluginId: "farm-plugin-slack" },
        "installCount",
        1,
      );
    });

    it("should install without orgId when not provided", async () => {
      registryRepo.findOne.mockResolvedValue(mockRegistryEntry);
      validator.validate.mockReturnValue({ valid: true, errors: [] });
      instanceRepo.create.mockReturnValue({ ...mockInstance, orgId: null });
      instanceRepo.save.mockResolvedValue({ ...mockInstance, orgId: null });
      instanceRepo.update.mockResolvedValue({});
      instanceRepo.findOne.mockResolvedValue({ ...mockInstance, orgId: null, status: PluginStatus.ACTIVE });
      registryRepo.increment.mockResolvedValue({});

      const result = await service.install("farm-plugin-slack");
      expect(result).toBeDefined();
    });
  });

  describe("enable", () => {
    it("should throw NotFoundException when instance does not exist", async () => {
      instanceRepo.findOne.mockResolvedValue(null);
      await expect(service.enable("bad-id")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when instance is not disabled", async () => {
      instanceRepo.findOne.mockResolvedValue({
        ...mockInstance,
        status: PluginStatus.ACTIVE,
      });
      await expect(service.enable("instance-uuid")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should enable a disabled instance", async () => {
      const disabledInstance = { ...mockInstance, status: PluginStatus.DISABLED };
      const activeInstance = { ...mockInstance, status: PluginStatus.ACTIVE };

      instanceRepo.findOne
        .mockResolvedValueOnce(disabledInstance)
        .mockResolvedValueOnce(activeInstance);
      instanceRepo.update.mockResolvedValue({});

      const result = await service.enable("instance-uuid");
      expect(result.status).toBe(PluginStatus.ACTIVE);
      expect(instanceRepo.update).toHaveBeenCalledWith("instance-uuid", {
        status: PluginStatus.ACTIVE,
      });
    });
  });

  describe("disable", () => {
    it("should throw NotFoundException when instance does not exist", async () => {
      instanceRepo.findOne.mockResolvedValue(null);
      await expect(service.disable("bad-id")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when instance is not active", async () => {
      instanceRepo.findOne.mockResolvedValue({
        ...mockInstance,
        status: PluginStatus.DISABLED,
      });
      await expect(service.disable("instance-uuid")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should disable an active instance", async () => {
      const activeInstance = { ...mockInstance, status: PluginStatus.ACTIVE };
      const disabledInstance = { ...mockInstance, status: PluginStatus.DISABLED };

      instanceRepo.findOne
        .mockResolvedValueOnce(activeInstance)
        .mockResolvedValueOnce(disabledInstance);
      instanceRepo.update.mockResolvedValue({});

      const result = await service.disable("instance-uuid");
      expect(result.status).toBe(PluginStatus.DISABLED);
      expect(instanceRepo.update).toHaveBeenCalledWith("instance-uuid", {
        status: PluginStatus.DISABLED,
      });
    });
  });

  describe("uninstall", () => {
    it("should throw NotFoundException when instance does not exist", async () => {
      instanceRepo.findOne.mockResolvedValue(null);
      await expect(service.uninstall("bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delete the instance", async () => {
      instanceRepo.findOne.mockResolvedValue(mockInstance);
      instanceRepo.delete.mockResolvedValue({});

      await service.uninstall("instance-uuid");
      expect(instanceRepo.delete).toHaveBeenCalledWith("instance-uuid");
    });
  });

  describe("getHealth", () => {
    it("should throw NotFoundException when instance does not exist", async () => {
      instanceRepo.findOne.mockResolvedValue(null);
      await expect(service.getHealth("bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return the current healthStatus", async () => {
      instanceRepo.findOne.mockResolvedValue({
        ...mockInstance,
        healthStatus: PluginHealthStatus.HEALTHY,
      });

      const result = await service.getHealth("instance-uuid");
      expect(result).toEqual({ status: PluginHealthStatus.HEALTHY });
    });
  });

  describe("findAll", () => {
    it("should return all instances when no orgId is provided", async () => {
      instanceRepo.find.mockResolvedValue([mockInstance]);
      const result = await service.findAll();
      expect(instanceRepo.find).toHaveBeenCalledWith();
      expect(result).toHaveLength(1);
    });

    it("should filter by orgId when provided", async () => {
      instanceRepo.find.mockResolvedValue([mockInstance]);
      const result = await service.findAll("org-uuid");
      expect(instanceRepo.find).toHaveBeenCalledWith({
        where: { orgId: "org-uuid" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findOne", () => {
    it("should return the instance when found", async () => {
      instanceRepo.findOne.mockResolvedValue(mockInstance);
      const result = await service.findOne("instance-uuid");
      expect(result).toEqual(mockInstance);
    });

    it("should throw NotFoundException when not found", async () => {
      instanceRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("bad-id")).rejects.toThrow(NotFoundException);
    });
  });
});
