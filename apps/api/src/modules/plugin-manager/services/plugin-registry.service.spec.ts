import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PluginRegistryService } from "./plugin-registry.service";
import { PluginRegistryEntry } from "../entities/plugin-registry-entry.entity";
import { PluginManifestV2 } from "../interfaces/plugin-manifest-v2.interface";

describe("PluginRegistryService", () => {
  let service: PluginRegistryService;
  let registryRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    increment: jest.Mock;
  };
  let validator: { validate: jest.Mock };

  const validManifest: PluginManifestV2 = {
    id: "farm-plugin-slack",
    name: "Slack Integration",
    version: "1.0.0",
    description: "Sends notifications to Slack",
    entryPoint: "https://cdn.example.com/slack.js",
  };

  const mockEntry: Partial<PluginRegistryEntry> = {
    id: "entry-uuid",
    pluginId: "farm-plugin-slack",
    name: "Slack Integration",
    latestVersion: "1.0.0",
    description: "Sends notifications to Slack",
    manifest: validManifest as unknown as Record<string, unknown>,
    installCount: 3,
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockEntry]),
  };

  beforeEach(() => {
    registryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    };
    validator = { validate: jest.fn() };

    service = new PluginRegistryService(
      registryRepo as any,
      validator as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("search", () => {
    it("should return all entries when no filters are provided", async () => {
      const result = await service.search();
      expect(registryRepo.createQueryBuilder).toHaveBeenCalledWith("entry");
      expect(result).toHaveLength(1);
    });

    it("should apply name/description filter when query is provided", async () => {
      await service.search("slack");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.objectContaining({ q: "%slack%" }),
      );
    });

    it("should apply category filter when provided", async () => {
      await service.search(undefined, "messaging");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("category"),
        expect.objectContaining({ category: "messaging" }),
      );
    });

    it("should apply both filters when both are provided", async () => {
      await service.search("slack", "messaging");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe("publish", () => {
    it("should throw BadRequestException when manifest is invalid", async () => {
      validator.validate.mockReturnValue({
        valid: false,
        errors: ['Required field "id" is missing'],
      });
      await expect(service.publish(validManifest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should create a new entry when the plugin does not exist yet", async () => {
      validator.validate.mockReturnValue({ valid: true, errors: [] });
      registryRepo.findOne.mockResolvedValue(null);
      registryRepo.create.mockReturnValue(mockEntry);
      registryRepo.save.mockResolvedValue(mockEntry);

      const result = await service.publish(validManifest);
      expect(registryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ pluginId: "farm-plugin-slack" }),
      );
      expect(result).toEqual(mockEntry);
    });

    it("should update an existing entry when the plugin is already registered", async () => {
      validator.validate.mockReturnValue({ valid: true, errors: [] });
      registryRepo.findOne
        .mockResolvedValueOnce(mockEntry)
        .mockResolvedValueOnce({ ...mockEntry, latestVersion: "1.0.0" });
      registryRepo.update.mockResolvedValue({});

      const result = await service.publish(validManifest);
      expect(registryRepo.update).toHaveBeenCalledWith(
        mockEntry.id,
        expect.objectContaining({ latestVersion: "1.0.0" }),
      );
      expect(result).toBeDefined();
    });
  });

  describe("findOne", () => {
    it("should return the entry when found", async () => {
      registryRepo.findOne.mockResolvedValue(mockEntry);
      const result = await service.findOne("farm-plugin-slack");
      expect(result).toEqual(mockEntry);
    });

    it("should throw NotFoundException when not found", async () => {
      registryRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("missing-plugin")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getVersions", () => {
    it("should return an array containing the latestVersion", async () => {
      registryRepo.findOne.mockResolvedValue(mockEntry);
      const result = await service.getVersions("farm-plugin-slack");
      expect(result).toEqual(["1.0.0"]);
    });

    it("should throw NotFoundException when the plugin is not found", async () => {
      registryRepo.findOne.mockResolvedValue(null);
      await expect(service.getVersions("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("incrementInstallCount", () => {
    it("should increment the install count for an existing plugin", async () => {
      registryRepo.findOne.mockResolvedValue(mockEntry);
      registryRepo.increment.mockResolvedValue({});

      await service.incrementInstallCount("farm-plugin-slack");
      expect(registryRepo.increment).toHaveBeenCalledWith(
        { pluginId: "farm-plugin-slack" },
        "installCount",
        1,
      );
    });

    it("should throw NotFoundException when the plugin does not exist", async () => {
      registryRepo.findOne.mockResolvedValue(null);
      await expect(
        service.incrementInstallCount("missing"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
