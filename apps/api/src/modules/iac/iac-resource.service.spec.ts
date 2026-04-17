import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { IacResourceService } from "./iac-resource.service";
import { IacStack } from "./entities/iac-stack.entity";
import { IacResource } from "./entities/iac-resource.entity";
import { IacResourceDependency } from "./entities/iac-resource-dependency.entity";

const VALID_TOKEN = "test-ingest-token";

describe("IacResourceService", () => {
  let service: IacResourceService;
  let stackRepo: Record<string, jest.Mock>;
  let resourceRepo: Record<string, jest.Mock | Record<string, jest.Mock>>;
  let depRepo: Record<string, jest.Mock>;
  let mockEntityManager: { delete: jest.Mock; save: jest.Mock };

  const mockStack: Partial<IacStack> = {
    id: "stack-uuid-1",
    name: "core-networking",
    environment: "production",
    provider: "terraform",
  };

  const mockResource: Partial<IacResource> = {
    id: "res-uuid-1",
    stackId: "stack-uuid-1",
    address: "aws_instance.web",
    resourceType: "aws_instance",
    resourceName: "web",
    provider: "aws",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockDep: Partial<IacResourceDependency> = {
    id: "dep-uuid-1",
    stackId: "stack-uuid-1",
    sourceAddress: "aws_instance.web",
    targetAddress: "aws_security_group.web",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    mockEntityManager = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest
        .fn()
        .mockImplementation((entities) => Promise.resolve(entities)),
    };

    stackRepo = {
      findOne: jest.fn(),
    };

    resourceRepo = {
      find: jest.fn(),
      create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
      manager: {
        transaction: jest.fn(
          (cb: (em: typeof mockEntityManager) => Promise<void>) =>
            cb(mockEntityManager),
        ),
      },
    };

    depRepo = {
      find: jest.fn(),
      create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IacResourceService,
        { provide: getRepositoryToken(IacStack), useValue: stackRepo },
        { provide: getRepositoryToken(IacResource), useValue: resourceRepo },
        {
          provide: getRepositoryToken(IacResourceDependency),
          useValue: depRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "iac.ingestToken") return VALID_TOKEN;
              if (key === "IAC_INGEST_TOKEN") return VALID_TOKEN;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<IacResourceService>(IacResourceService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // ingestResources
  // ---------------------------------------------------------------------------

  describe("ingestResources", () => {
    const dto = {
      resources: [
        {
          address: "aws_instance.web",
          resourceType: "aws_instance",
          resourceName: "web",
          provider: "aws",
        },
        {
          address: "aws_security_group.web",
          resourceType: "aws_security_group",
          resourceName: "web",
          provider: "aws",
        },
      ],
      dependencies: [
        { source: "aws_instance.web", target: "aws_security_group.web" },
      ],
    };

    it("throws UnauthorizedException for an invalid token", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await expect(
        service.ingestResources("stack-uuid-1", dto, "wrong-token"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when the stack does not exist", async () => {
      stackRepo.findOne.mockResolvedValue(null);

      await expect(
        service.ingestResources("stack-uuid-1", dto, VALID_TOKEN),
      ).rejects.toThrow(NotFoundException);
    });

    it("opens a transaction to atomically replace the topology (ST404)", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources("stack-uuid-1", dto, VALID_TOKEN);

      expect(
        (resourceRepo.manager as Record<string, jest.Mock>).transaction,
      ).toHaveBeenCalledTimes(1);
    });

    it("deletes existing resources before inserting new ones (ST404)", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources("stack-uuid-1", dto, VALID_TOKEN);

      // First delete call should be for IacResource
      expect(mockEntityManager.delete).toHaveBeenCalledWith(IacResource, {
        stackId: "stack-uuid-1",
      });
    });

    it("deletes existing dependencies before inserting new ones (ST404)", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources("stack-uuid-1", dto, VALID_TOKEN);

      expect(mockEntityManager.delete).toHaveBeenCalledWith(
        IacResourceDependency,
        { stackId: "stack-uuid-1" },
      );
    });

    it("saves new resource entities within the transaction", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources("stack-uuid-1", dto, VALID_TOKEN);

      // save is called twice: once for resources, once for dependencies
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      const [savedResources] = mockEntityManager.save.mock.calls[0] as [
        Array<{ stackId: string; address: string }>,
      ];
      expect(savedResources).toHaveLength(2);
      expect(savedResources[0].stackId).toBe("stack-uuid-1");
      expect(savedResources[0].address).toBe("aws_instance.web");
    });

    it("saves new dependency entities within the transaction", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources("stack-uuid-1", dto, VALID_TOKEN);

      const [savedDeps] = mockEntityManager.save.mock.calls[1] as [
        Array<{
          stackId: string;
          sourceAddress: string;
          targetAddress: string;
        }>,
      ];
      expect(savedDeps).toHaveLength(1);
      expect(savedDeps[0].sourceAddress).toBe("aws_instance.web");
      expect(savedDeps[0].targetAddress).toBe("aws_security_group.web");
    });

    it("skips resource insert when resources array is empty", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources(
        "stack-uuid-1",
        { resources: [], dependencies: [] },
        VALID_TOKEN,
      );

      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it("skips dependency insert when dependencies array is empty", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await service.ingestResources(
        "stack-uuid-1",
        { resources: [dto.resources[0]], dependencies: [] },
        VALID_TOKEN,
      );

      // save called only once (for the resource, not dependencies)
      expect(mockEntityManager.save).toHaveBeenCalledTimes(1);
    });

    it("resolves without error for a valid payload", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await expect(
        service.ingestResources("stack-uuid-1", dto, VALID_TOKEN),
      ).resolves.toBeUndefined();
    });

    it("throws UnauthorizedException when the configured token is an empty string", async () => {
      const moduleEmptyToken = await Test.createTestingModule({
        providers: [
          IacResourceService,
          { provide: getRepositoryToken(IacStack), useValue: stackRepo },
          { provide: getRepositoryToken(IacResource), useValue: resourceRepo },
          {
            provide: getRepositoryToken(IacResourceDependency),
            useValue: depRepo,
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue("") },
          },
        ],
      }).compile();
      const serviceEmptyToken =
        moduleEmptyToken.get<IacResourceService>(IacResourceService);

      await expect(
        serviceEmptyToken.ingestResources("stack-uuid-1", dto, VALID_TOKEN),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when a same-length token with wrong content is provided", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      // VALID_TOKEN is "test-ingest-token" (17 chars); use a different 17-char string
      await expect(
        service.ingestResources("stack-uuid-1", dto, "test-ingest-XXXXX"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws BadRequestException when dependencies reference unknown resource addresses", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      const badDto = {
        resources: [
          {
            address: "aws_instance.web",
            resourceType: "aws_instance",
            resourceName: "web",
            provider: "aws",
          },
        ],
        dependencies: [
          { source: "aws_instance.web", target: "aws_nonexistent.foo" },
        ],
      };

      await expect(
        service.ingestResources("stack-uuid-1", badDto, VALID_TOKEN),
      ).rejects.toThrow(BadRequestException);
    });

    it("accepts dependencies when all source and target addresses exist in resources", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);

      await expect(
        service.ingestResources("stack-uuid-1", dto, VALID_TOKEN),
      ).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getResources
  // ---------------------------------------------------------------------------

  describe("getResources", () => {
    it("throws NotFoundException when the stack does not exist", async () => {
      stackRepo.findOne.mockResolvedValue(null);

      await expect(service.getResources("stack-uuid-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns resources and dependencies mapped to DTO shape", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      (resourceRepo.find as jest.Mock).mockResolvedValue([mockResource]);
      depRepo.find.mockResolvedValue([mockDep]);

      const result = await service.getResources("stack-uuid-1");

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]).toEqual({
        address: "aws_instance.web",
        resourceType: "aws_instance",
        resourceName: "web",
        provider: "aws",
      });

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        source: "aws_instance.web",
        target: "aws_security_group.web",
      });
    });

    it("returns empty arrays when no resources have been ingested", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      (resourceRepo.find as jest.Mock).mockResolvedValue([]);
      depRepo.find.mockResolvedValue([]);

      const result = await service.getResources("stack-uuid-1");

      expect(result.resources).toHaveLength(0);
      expect(result.dependencies).toHaveLength(0);
    });

    it("queries resources with stackId filter and ASC address order", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      (resourceRepo.find as jest.Mock).mockResolvedValue([]);
      depRepo.find.mockResolvedValue([]);

      await service.getResources("stack-uuid-1");

      expect(resourceRepo.find).toHaveBeenCalledWith({
        where: { stackId: "stack-uuid-1" },
        order: { address: "ASC" },
      });
    });

    it("queries dependencies with stackId filter", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      (resourceRepo.find as jest.Mock).mockResolvedValue([]);
      depRepo.find.mockResolvedValue([]);

      await service.getResources("stack-uuid-1");

      expect(depRepo.find).toHaveBeenCalledWith({
        where: { stackId: "stack-uuid-1" },
      });
    });
  });
});
