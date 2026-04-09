import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { KedaBindingService } from "./keda-binding.service";
import { KedaBinding } from "./entities/keda-binding.entity";
import { CreateKedaBindingDto } from "./dto/create-keda-binding.dto";

describe("KedaBindingService", () => {
  let service: KedaBindingService;
  let repo: Record<string, jest.Mock>;

  const mockBinding: KedaBinding = {
    id: "keda-binding-uuid-1",
    scaledObjectName: "my-app-scaler",
    scaledObjectNamespace: "production",
    componentId: "comp-uuid-1",
    component: {
      id: "comp-uuid-1",
      name: "my-app",
    } as KedaBinding["component"],
    boundAt: new Date("2024-01-01T00:00:00Z"),
    organizationId: "org-uuid-1",
  };

  const createDto: CreateKedaBindingDto = {
    scaledObjectName: "my-app-scaler",
    scaledObjectNamespace: "production",
    componentId: "comp-uuid-1",
    organizationId: "org-uuid-1",
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KedaBindingService,
        {
          provide: getRepositoryToken(KedaBinding),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<KedaBindingService>(KedaBindingService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create a new KEDA binding successfully", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockBinding);
      repo.save.mockResolvedValue(mockBinding);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          scaledObjectName: createDto.scaledObjectName,
          scaledObjectNamespace: createDto.scaledObjectNamespace,
          componentId: createDto.componentId,
          organizationId: createDto.organizationId,
        },
      });
      expect(repo.create).toHaveBeenCalledWith(createDto);
      expect(repo.save).toHaveBeenCalledWith(mockBinding);
      expect(result).toEqual(mockBinding);
    });

    it("should create a binding without organizationId when not provided", async () => {
      const dtoWithoutOrg: CreateKedaBindingDto = {
        scaledObjectName: "my-app-scaler",
        scaledObjectNamespace: "production",
        componentId: "comp-uuid-1",
      };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockBinding);
      repo.save.mockResolvedValue(mockBinding);

      await service.create(dtoWithoutOrg);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          scaledObjectName: dtoWithoutOrg.scaledObjectName,
          scaledObjectNamespace: dtoWithoutOrg.scaledObjectNamespace,
          componentId: dtoWithoutOrg.componentId,
        },
      });
    });

    it("should throw ConflictException when a duplicate binding exists", async () => {
      repo.findOne.mockResolvedValue(mockBinding);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `Binding already exists for ScaledObject "${createDto.scaledObjectName}" in namespace "${createDto.scaledObjectNamespace}" with component "${createDto.componentId}"`,
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByScaledObject
  // ---------------------------------------------------------------------------

  describe("findByScaledObject", () => {
    it("should return bindings filtered by scaledObjectName and namespace", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByScaledObject(
        "my-app-scaler",
        "production",
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          scaledObjectName: "my-app-scaler",
          scaledObjectNamespace: "production",
        },
        relations: ["component"],
      });
      expect(result).toEqual([mockBinding]);
    });

    it("should filter by organizationId when provided", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByScaledObject(
        "my-app-scaler",
        "production",
        "org-uuid-1",
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          scaledObjectName: "my-app-scaler",
          scaledObjectNamespace: "production",
          organizationId: "org-uuid-1",
        },
        relations: ["component"],
      });
      expect(result).toEqual([mockBinding]);
    });
  });

  // ---------------------------------------------------------------------------
  // findByComponent
  // ---------------------------------------------------------------------------

  describe("findByComponent", () => {
    it("should return bindings by componentId with component relation loaded", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByComponent("comp-uuid-1");

      expect(repo.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        relations: ["component"],
      });
      expect(result).toEqual([mockBinding]);
    });

    it("should filter by organizationId when provided", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByComponent("comp-uuid-1", "org-uuid-1");

      expect(repo.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1", organizationId: "org-uuid-1" },
        relations: ["component"],
      });
      expect(result).toEqual([mockBinding]);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("should remove a KEDA binding by id successfully", async () => {
      repo.findOne.mockResolvedValue(mockBinding);
      repo.remove.mockResolvedValue(undefined);

      await expect(
        service.remove("keda-binding-uuid-1"),
      ).resolves.toBeUndefined();

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "keda-binding-uuid-1" },
      });
      expect(repo.remove).toHaveBeenCalledWith(mockBinding);
    });

    it("should throw NotFoundException when binding does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent-uuid")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove("nonexistent-uuid")).rejects.toThrow(
        'KEDA binding with id "nonexistent-uuid" not found',
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it("should remove successfully when org matches binding org", async () => {
      repo.findOne.mockResolvedValue(mockBinding);
      repo.remove.mockResolvedValue(undefined);

      await expect(
        service.remove("keda-binding-uuid-1", "org-uuid-1"),
      ).resolves.toBeUndefined();

      expect(repo.remove).toHaveBeenCalledWith(mockBinding);
    });

    it("should throw NotFoundException when org does not match binding org", async () => {
      repo.findOne.mockResolvedValue(mockBinding);

      await expect(
        service.remove("keda-binding-uuid-1", "different-org"),
      ).rejects.toThrow(NotFoundException);

      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
