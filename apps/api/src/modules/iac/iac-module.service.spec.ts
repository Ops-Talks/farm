import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { IacModuleService } from "./iac-module.service";
import {
  IacModule as IacModuleEntity,
  IacProvider,
} from "./entities/iac-module.entity";
import { IacModuleVersion } from "./entities/iac-module-version.entity";
import { CreateIacModuleDto } from "./dto/create-iac-module.dto";

describe("IacModuleService", () => {
  let service: IacModuleService;
  let moduleRepo: Record<string, jest.Mock>;
  let versionRepo: Record<string, jest.Mock>;

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

  const mockVersion: IacModuleVersion = {
    id: "version-uuid-1",
    moduleId: "module-uuid-1",
    module: mockModule,
    version: "v5.1.2",
    variablesMeta: [
      {
        name: "vpc_cidr",
        type: "string",
        description: "CIDR block for the VPC",
        default: "10.0.0.0/16",
        required: false,
        validation: null,
      },
    ],
    outputsMeta: [
      {
        name: "vpc_id",
        description: "The ID of the VPC",
        value: "aws_vpc.main.id",
      },
    ],
    syncedAt: new Date("2024-01-01T10:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    getParsedVariables: jest.fn(),
    getParsedOutputs: jest.fn(),
  };

  beforeEach(async () => {
    moduleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    versionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IacModuleService,
        { provide: getRepositoryToken(IacModuleEntity), useValue: moduleRepo },
        {
          provide: getRepositoryToken(IacModuleVersion),
          useValue: versionRepo,
        },
      ],
    }).compile();

    service = module.get<IacModuleService>(IacModuleService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    const dto: CreateIacModuleDto = {
      name: "terraform-aws-vpc",
      provider: IacProvider.AWS,
      sourceRepoUrl:
        "https://github.com/terraform-aws-modules/terraform-aws-vpc",
      description: "Creates a VPC on AWS",
    };

    it("creates and returns the module when no duplicate exists", async () => {
      moduleRepo.findOne.mockResolvedValue(null);
      moduleRepo.create.mockReturnValue(mockModule);
      moduleRepo.save.mockResolvedValue(mockModule);

      const result = await service.create(dto);

      expect(moduleRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: dto.provider,
          }) as unknown,
        }),
      );
      expect(moduleRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockModule);
    });

    it("creates a module with componentId when provided", async () => {
      const dtoWithComponent: CreateIacModuleDto = {
        ...dto,
        componentId: "comp-uuid-99",
      };
      const moduleWithComponent = {
        ...mockModule,
        componentId: "comp-uuid-99",
      };
      moduleRepo.findOne.mockResolvedValue(null);
      moduleRepo.create.mockReturnValue(moduleWithComponent);
      moduleRepo.save.mockResolvedValue(moduleWithComponent);

      const result = await service.create(dtoWithComponent);

      expect(result.componentId).toBe("comp-uuid-99");
    });

    it("creates a module without optional fields", async () => {
      const minimalDto: CreateIacModuleDto = {
        name: "terraform-minimal",
        provider: IacProvider.AWS,
        sourceRepoUrl: "https://github.com/example/minimal",
      };
      const minimalModule = {
        ...mockModule,
        description: null,
        componentId: null,
      };
      moduleRepo.findOne.mockResolvedValue(null);
      moduleRepo.create.mockReturnValue(minimalModule);
      moduleRepo.save.mockResolvedValue(minimalModule);

      const result = await service.create(minimalDto);

      expect(result.description).toBeNull();
      expect(result.componentId).toBeNull();
    });

    it("throws ConflictException when a module with the same name+provider exists", async () => {
      moduleRepo.findOne.mockResolvedValue(mockModule);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe("findAll", () => {
    it("returns all modules when no filter is applied", async () => {
      moduleRepo.find.mockResolvedValue([mockModule]);

      const result = await service.findAll();

      expect(moduleRepo.find).toHaveBeenCalledWith({
        where: undefined,
        order: { name: "ASC" },
      });
      expect(result).toHaveLength(1);
    });

    it("applies provider filter when provided", async () => {
      moduleRepo.find.mockResolvedValue([mockModule]);

      await service.findAll({ provider: IacProvider.AWS });

      const call = (moduleRepo.find.mock.calls[0] as unknown[])[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where.provider).toBe(IacProvider.AWS);
    });

    it("applies search filter when provided", async () => {
      moduleRepo.find.mockResolvedValue([mockModule]);

      await service.findAll({ search: "vpc" });

      const call = (moduleRepo.find.mock.calls[0] as unknown[])[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where.name).toBeDefined();
    });

    it("applies engine filter when provided", async () => {
      moduleRepo.find.mockResolvedValue([mockModule]);

      await service.findAll({ engine: "terraform" as never });

      const call = (moduleRepo.find.mock.calls[0] as unknown[])[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where.engine).toBe("terraform");
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe("findOne", () => {
    it("returns the module when found", async () => {
      moduleRepo.findOne.mockResolvedValue(mockModule);

      const result = await service.findOne("module-uuid-1");
      expect(result).toEqual(mockModule);
    });

    it("throws NotFoundException when module does not exist", async () => {
      moduleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findVersions
  // ---------------------------------------------------------------------------

  describe("findVersions", () => {
    it("returns versions for the module with isLatest flag", async () => {
      moduleRepo.findOne.mockResolvedValue(mockModule);
      versionRepo.find.mockResolvedValue([mockVersion]);

      const result = await service.findVersions("module-uuid-1");

      expect(versionRepo.find).toHaveBeenCalledWith({
        where: { moduleId: "module-uuid-1" },
        order: { version: "DESC" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].isLatest).toBe(true);
    });

    it("throws NotFoundException when module does not exist", async () => {
      moduleRepo.findOne.mockResolvedValue(null);

      await expect(service.findVersions("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe("update", () => {
    it("updates and returns the module", async () => {
      const updated = { ...mockModule, description: "Updated description" };
      moduleRepo.findOne.mockResolvedValue({ ...mockModule });
      moduleRepo.save.mockResolvedValue(updated);

      const result = await service.update("module-uuid-1", {
        description: "Updated description",
      });

      expect(moduleRepo.save).toHaveBeenCalled();
      expect(result.description).toBe("Updated description");
    });

    it("updates all mutable fields in a single call", async () => {
      const base = { ...mockModule };
      moduleRepo.findOne.mockResolvedValue(base);
      moduleRepo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update("module-uuid-1", {
        name: "new-name",
        provider: IacProvider.GCP,
        sourceRepoUrl: "https://github.com/example/new-repo",
        description: "New description",
        componentId: "comp-uuid-99",
      });

      expect(result.name).toBe("new-name");
      expect(result.provider).toBe(IacProvider.GCP);
      expect(result.sourceRepoUrl).toBe("https://github.com/example/new-repo");
      expect(result.description).toBe("New description");
      expect(result.componentId).toBe("comp-uuid-99");
    });

    it("updates only name when only name is provided", async () => {
      const base = { ...mockModule };
      moduleRepo.findOne.mockResolvedValue(base);
      moduleRepo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update("module-uuid-1", {
        name: "renamed-module",
      });

      expect(result.name).toBe("renamed-module");
      expect(result.description).toBe(mockModule.description);
    });

    it("sets description and componentId to null when explicitly passed null", async () => {
      const base = {
        ...mockModule,
        description: "Old desc",
        componentId: "old-comp",
      };
      moduleRepo.findOne.mockResolvedValue(base);
      moduleRepo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update("module-uuid-1", {
        description: null,
        componentId: null,
      });

      expect(result.description).toBeNull();
      expect(result.componentId).toBeNull();
    });

    it("throws NotFoundException when module does not exist", async () => {
      moduleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("missing", { description: "x" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("removes the module", async () => {
      moduleRepo.findOne.mockResolvedValue(mockModule);
      moduleRepo.remove.mockResolvedValue(undefined);

      await service.remove("module-uuid-1");

      expect(moduleRepo.remove).toHaveBeenCalledWith(mockModule);
    });

    it("throws NotFoundException when module does not exist", async () => {
      moduleRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // linkComponent / unlinkComponent
  // ---------------------------------------------------------------------------

  describe("linkComponent", () => {
    it("sets componentId on the module", async () => {
      const mutableModule = { ...mockModule, componentId: null };
      moduleRepo.findOne.mockResolvedValue(mutableModule);
      moduleRepo.save.mockImplementation((m) => Promise.resolve({ ...m }));

      const result = await service.linkComponent(
        "module-uuid-1",
        "comp-uuid-1",
      );

      expect(result.componentId).toBe("comp-uuid-1");
    });
  });

  describe("unlinkComponent", () => {
    it("clears componentId on the module", async () => {
      const mutableModule = { ...mockModule, componentId: "comp-uuid-1" };
      moduleRepo.findOne.mockResolvedValue(mutableModule);
      moduleRepo.save.mockImplementation((m) => Promise.resolve({ ...m }));

      const result = await service.unlinkComponent("module-uuid-1");

      expect(result.componentId).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getModulesByComponent
  // ---------------------------------------------------------------------------

  describe("getModulesByComponent", () => {
    it("returns modules for the given componentId", async () => {
      moduleRepo.find.mockResolvedValue([mockModule]);

      const result = await service.getModulesByComponent("comp-uuid-1");

      expect(moduleRepo.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        order: { name: "ASC" },
      });
      expect(result).toHaveLength(1);
    });
  });
});
