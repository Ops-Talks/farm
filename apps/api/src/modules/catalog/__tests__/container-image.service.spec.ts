import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { SelectQueryBuilder } from "typeorm";
import { CatalogService } from "../catalog.service";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../entities/component.entity";
import { SetContainerImageDto } from "../dto/set-container-image.dto";
import { RegistryService } from "../../registry/registry.service";

describe("CatalogService — container image methods", () => {
  let service: CatalogService;

  const baseComponent: Component = {
    id: "comp-uuid-001",
    name: "my-service",
    kind: ComponentKind.SERVICE,
    description: "A test service",
    owner: "team-a",
    teamId: null as unknown as string,
    team: null,
    lifecycle: ComponentLifecycle.PRODUCTION,
    tags: [],
    links: [],
    metadata: {},
    helmChart: null,
    argocdApp: null,
    containerImage: null,
    dependencies: [],
    organizationId: null as unknown as string,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  } as unknown as SelectQueryBuilder<Component>;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockRegistryService = {
    listTags: jest.fn(),
  };

  function buildModule(withRegistry: boolean): Promise<TestingModule> {
    const providers = [
      CatalogService,
      {
        provide: getRepositoryToken(Component),
        useValue: mockRepository,
      },
    ];

    if (withRegistry) {
      providers.push({
        provide: RegistryService,
        useValue: mockRegistryService,
      });
    }

    return Test.createTestingModule({ providers }).compile();
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // setContainerImage
  // ---------------------------------------------------------------------------
  describe("setContainerImage", () => {
    it("saves the component with containerImage set from DTO", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      mockRepository.findOne.mockResolvedValue({ ...baseComponent });
      mockRepository.save.mockImplementation((c: Component) =>
        Promise.resolve({ ...c }),
      );

      const dto: SetContainerImageDto = {
        registry: "ecr",
        image: "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp",
        latestTag: "1.2.3",
        digest: "sha256:abc123",
        pushedAt: "2024-01-01T00:00:00Z",
      };

      const result = await service.setContainerImage("comp-uuid-001", dto);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(result.containerImage).toMatchObject({
        registry: "ecr",
        image: "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp",
        latestTag: "1.2.3",
        digest: "sha256:abc123",
      });
      expect(result.containerImage?.pushedAt).toBeInstanceOf(Date);
    });

    it("sets containerImage without optional fields when they are omitted", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      mockRepository.findOne.mockResolvedValue({ ...baseComponent });
      mockRepository.save.mockImplementation((c: Component) =>
        Promise.resolve({ ...c }),
      );

      const dto: SetContainerImageDto = {
        registry: "dockerhub",
        image: "myorg/myapp",
      };

      const result = await service.setContainerImage("comp-uuid-001", dto);

      expect(result.containerImage?.registry).toBe("dockerhub");
      expect(result.containerImage?.image).toBe("myorg/myapp");
      expect(result.containerImage?.latestTag).toBeUndefined();
      expect(result.containerImage?.digest).toBeUndefined();
      expect(result.containerImage?.pushedAt).toBeUndefined();
    });

    it("throws NotFoundException when component does not exist", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setContainerImage("nonexistent-id", {
          registry: "ecr",
          image: "myapp",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // syncContainerImage
  // ---------------------------------------------------------------------------
  describe("syncContainerImage", () => {
    it("throws NotFoundException when component has no containerImage configured", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      mockRepository.findOne.mockResolvedValue({
        ...baseComponent,
        containerImage: null,
      });

      await expect(service.syncContainerImage("comp-uuid-001")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("skips gracefully and returns component when registryService is not available", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      const componentWithImage = {
        ...baseComponent,
        containerImage: {
          registry: "ecr",
          image: "myapp",
          latestTag: "1.0.0",
        },
      };
      mockRepository.findOne.mockResolvedValue(componentWithImage);

      const result = await service.syncContainerImage("comp-uuid-001");

      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(result.containerImage?.latestTag).toBe("1.0.0");
    });

    it("updates latestTag, digest, and pushedAt from registryService", async () => {
      const module = await buildModule(true);
      service = module.get<CatalogService>(CatalogService);

      const componentWithImage = {
        ...baseComponent,
        containerImage: {
          registry: "ecr",
          image: "myapp",
          latestTag: "1.0.0",
        },
      };
      const updatedComponent = {
        ...componentWithImage,
        containerImage: {
          registry: "ecr",
          image: "myapp",
          latestTag: "2.0.0",
          digest: "sha256:newdigest",
          pushedAt: new Date("2024-06-01"),
        },
      };

      mockRepository.findOne
        .mockResolvedValueOnce(componentWithImage)
        .mockResolvedValueOnce(updatedComponent);
      mockRepository.save.mockResolvedValue(updatedComponent);
      mockRegistryService.listTags.mockResolvedValue([
        {
          tag: "2.0.0",
          digest: "sha256:newdigest",
          pushedAt: new Date("2024-06-01"),
        },
      ]);

      const result = await service.syncContainerImage("comp-uuid-001");

      expect(mockRegistryService.listTags).toHaveBeenCalledWith("myapp");
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(result.containerImage?.latestTag).toBe("2.0.0");
    });

    it("handles registry errors gracefully — warns and returns original component", async () => {
      const module = await buildModule(true);
      service = module.get<CatalogService>(CatalogService);

      const componentWithImage = {
        ...baseComponent,
        containerImage: {
          registry: "ecr",
          image: "myapp",
          latestTag: "1.0.0",
        },
      };

      mockRepository.findOne
        .mockResolvedValueOnce(componentWithImage)
        .mockResolvedValueOnce(componentWithImage);
      mockRegistryService.listTags.mockRejectedValue(
        new Error("Registry unavailable"),
      );

      // Should NOT throw
      const result = await service.syncContainerImage("comp-uuid-001");
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("does not update when registry returns an empty tag list", async () => {
      const module = await buildModule(true);
      service = module.get<CatalogService>(CatalogService);

      const componentWithImage = {
        ...baseComponent,
        containerImage: { registry: "ecr", image: "myapp", latestTag: "1.0.0" },
      };

      mockRepository.findOne
        .mockResolvedValueOnce(componentWithImage)
        .mockResolvedValueOnce(componentWithImage);
      mockRegistryService.listTags.mockResolvedValue([]);

      await service.syncContainerImage("comp-uuid-001");

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findAllWithContainerImage
  // ---------------------------------------------------------------------------
  describe("findAllWithContainerImage", () => {
    it("returns only components where containerImage is not null", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      const componentsWithImage = [
        {
          ...baseComponent,
          id: "id-1",
          containerImage: { registry: "ecr", image: "app1" },
        },
        {
          ...baseComponent,
          id: "id-2",
          containerImage: { registry: "gcr", image: "app2" },
        },
      ];

      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(
        componentsWithImage,
      );

      const result = await service.findAllWithContainerImage();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "c.containerImage IS NOT NULL",
      );
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no components have a containerImage", async () => {
      const module = await buildModule(false);
      service = module.get<CatalogService>(CatalogService);

      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllWithContainerImage();

      expect(result).toEqual([]);
    });
  });
});
