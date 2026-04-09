import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { FluxBindingService } from "./flux-binding.service";
import { FluxBinding } from "./entities/flux-binding.entity";
import { CreateFluxBindingDto } from "./dto/create-flux-binding.dto";

describe("FluxBindingService", () => {
  let service: FluxBindingService;
  let repo: Record<string, jest.Mock>;

  const mockBinding: FluxBinding = {
    id: "flux-binding-uuid-1",
    resourceKind: "Kustomization",
    resourceName: "my-app",
    resourceNamespace: "flux-system",
    componentId: "comp-uuid-1",
    component: {
      id: "comp-uuid-1",
      name: "my-app",
    } as FluxBinding["component"],
    boundAt: new Date("2024-01-01T00:00:00Z"),
    organizationId: "org-uuid-1",
  };

  const createDto: CreateFluxBindingDto = {
    resourceKind: "Kustomization",
    resourceName: "my-app",
    resourceNamespace: "flux-system",
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
        FluxBindingService,
        {
          provide: getRepositoryToken(FluxBinding),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<FluxBindingService>(FluxBindingService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create a new binding successfully", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockBinding);
      repo.save.mockResolvedValue(mockBinding);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          resourceKind: createDto.resourceKind,
          resourceName: createDto.resourceName,
          resourceNamespace: createDto.resourceNamespace,
          componentId: createDto.componentId,
          organizationId: createDto.organizationId,
        },
      });
      expect(repo.create).toHaveBeenCalledWith(createDto);
      expect(repo.save).toHaveBeenCalledWith(mockBinding);
      expect(result).toEqual(mockBinding);
    });

    it("should throw ConflictException when a duplicate binding exists", async () => {
      repo.findOne.mockResolvedValue(mockBinding);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `Binding already exists for ${createDto.resourceKind} "${createDto.resourceName}" in namespace "${createDto.resourceNamespace}" with component "${createDto.componentId}"`,
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("should create a binding without organizationId when not provided", async () => {
      const dtoWithoutOrg: CreateFluxBindingDto = {
        resourceKind: "HelmRelease",
        resourceName: "nginx",
        resourceNamespace: "ingress",
        componentId: "comp-uuid-2",
      };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...mockBinding, ...dtoWithoutOrg });
      repo.save.mockResolvedValue({ ...mockBinding, ...dtoWithoutOrg });

      await service.create(dtoWithoutOrg);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          resourceKind: dtoWithoutOrg.resourceKind,
          resourceName: dtoWithoutOrg.resourceName,
          resourceNamespace: dtoWithoutOrg.resourceNamespace,
          componentId: dtoWithoutOrg.componentId,
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findByResource
  // ---------------------------------------------------------------------------

  describe("findByResource", () => {
    it("should return bindings filtered by resource with organizationId", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByResource(
        "Kustomization",
        "my-app",
        "flux-system",
        "org-uuid-1",
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          resourceKind: "Kustomization",
          resourceName: "my-app",
          resourceNamespace: "flux-system",
          organizationId: "org-uuid-1",
        },
        relations: ["component"],
      });
      expect(result).toEqual([mockBinding]);
    });

    it("should omit organizationId from where clause when not provided", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByResource(
        "HelmRelease",
        "nginx",
        "ingress",
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          resourceKind: "HelmRelease",
          resourceName: "nginx",
          resourceNamespace: "ingress",
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
    it("should delete a binding successfully by id", async () => {
      repo.findOne.mockResolvedValue(mockBinding);
      repo.remove.mockResolvedValue(undefined);

      await expect(
        service.remove("flux-binding-uuid-1"),
      ).resolves.toBeUndefined();

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "flux-binding-uuid-1" },
      });
      expect(repo.remove).toHaveBeenCalledWith(mockBinding);
    });

    it("should throw NotFoundException when binding does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove("nonexistent-id")).rejects.toThrow(
        'Flux binding "nonexistent-id" not found',
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
