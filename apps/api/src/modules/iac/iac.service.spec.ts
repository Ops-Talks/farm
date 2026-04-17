import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import { IacService } from "./iac.service";
import { IacStack } from "./entities/iac-stack.entity";
import { IacRun, IacRunType, IacRunStatus } from "./entities/iac-run.entity";
import { IacModuleDrift } from "./entities/iac-module-drift.entity";
import { IngestRunDto } from "./dto/ingest-run.dto";
import { ImportStacksDto } from "./dto/import-stacks.dto";
import { IngestModuleDriftDto } from "./dto/ingest-module-drift.dto";

const VALID_TOKEN = "test-ingest-token";

describe("IacService", () => {
  let service: IacService;
  let stackRepo: Record<string, jest.Mock>;
  let runRepo: Record<string, jest.Mock>;
  let driftRepo: Record<string, jest.Mock>;

  const mockStack: IacStack = {
    id: "stack-uuid-1",
    name: "core-networking",
    environment: "production",
    provider: "terraform",
    repositoryUrl: null,
    basePath: null,
    externalToolUrl: null,
    componentId: null,
    autoImported: false,
    runs: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockRun: IacRun = {
    id: "run-uuid-1",
    stackId: "stack-uuid-1",
    stack: mockStack,
    type: IacRunType.PLAN,
    status: IacRunStatus.SUCCEEDED,
    environment: "production",
    provider: "terraform",
    resourceChanges: { add: 2, change: 1, destroy: 0 },
    triggeredBy: "github-actions",
    pipelineUrl: null,
    startedAt: new Date("2024-01-01T10:00:00Z"),
    finishedAt: new Date("2024-01-01T10:03:00Z"),
    durationMs: 180000,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    stackRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
    };

    runRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    driftRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IacService,
        { provide: getRepositoryToken(IacStack), useValue: stackRepo },
        { provide: getRepositoryToken(IacRun), useValue: runRepo },
        { provide: getRepositoryToken(IacModuleDrift), useValue: driftRepo },
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

    service = module.get<IacService>(IacService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // ingestRun
  // ---------------------------------------------------------------------------
  describe("ingestRun", () => {
    const dto: IngestRunDto = {
      stackName: "core-networking",
      environment: "production",
      provider: "terraform",
      type: IacRunType.PLAN,
      status: IacRunStatus.SUCCEEDED,
      resourceChanges: { add: 2, change: 1, destroy: 0 },
      triggeredBy: "github-actions",
    };

    it("should throw UnauthorizedException for an invalid token", async () => {
      await expect(
        service.ingestRun(dto, "wrong-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw UnauthorizedException when no token is configured", async () => {
      const moduleNoToken = await Test.createTestingModule({
        providers: [
          IacService,
          { provide: getRepositoryToken(IacStack), useValue: stackRepo },
          { provide: getRepositoryToken(IacRun), useValue: runRepo },
          { provide: getRepositoryToken(IacModuleDrift), useValue: driftRepo },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();
      const serviceNoToken = moduleNoToken.get<IacService>(IacService);

      await expect(
        serviceNoToken.ingestRun(dto, "any-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw UnauthorizedException for a same-length token with wrong content", async () => {
      // VALID_TOKEN is "test-ingest-token" (17 chars); use a different 17-char token
      await expect(
        service.ingestRun(dto, "test-ingest-XXXXX"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should create a run when the stack already exists", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      const result = await service.ingestRun(dto, VALID_TOKEN);

      expect(stackRepo.findOne).toHaveBeenCalledWith({
        where: { name: dto.stackName, environment: dto.environment },
      });
      expect(stackRepo.create).not.toHaveBeenCalled();
      expect(runRepo.create).toHaveBeenCalled();
      expect(runRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockRun);
    });

    it("should auto-create the stack when it does not exist", async () => {
      const autoStack = { ...mockStack, autoImported: true };
      stackRepo.findOne.mockResolvedValue(null);
      stackRepo.create.mockReturnValue(autoStack);
      stackRepo.save.mockResolvedValue(autoStack);
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      const result = await service.ingestRun(dto, VALID_TOKEN);

      expect(stackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ autoImported: true }),
      );
      expect(stackRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockRun);
    });

    it("should default provider to 'terraform' when auto-creating a stack without a provider field", async () => {
      const dtoNoProvider: IngestRunDto = {
        stackName: "core-networking",
        environment: "production",
        type: IacRunType.PLAN,
        status: IacRunStatus.SUCCEEDED,
      };
      const autoStack = {
        ...mockStack,
        provider: "terraform",
        autoImported: true,
      };
      stackRepo.findOne.mockResolvedValue(null);
      stackRepo.create.mockReturnValue(autoStack);
      stackRepo.save.mockResolvedValue(autoStack);
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      await service.ingestRun(dtoNoProvider, VALID_TOKEN);

      expect(stackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "terraform" }),
      );
    });

    it("should use finishedAt as fallback startedAt and record durationMs", async () => {
      const dtoWithTimes: IngestRunDto = {
        stackName: "core-networking",
        environment: "production",
        type: IacRunType.APPLY,
        status: IacRunStatus.SUCCEEDED,
        startedAt: "2024-06-01T09:00:00Z",
        finishedAt: "2024-06-01T09:05:00Z",
        durationMs: 300000,
      };
      stackRepo.findOne.mockResolvedValue(mockStack);
      runRepo.create.mockImplementation(
        (data: Partial<IacRun>) => data as IacRun,
      );
      runRepo.save.mockImplementation((r: IacRun) => Promise.resolve(r));

      await service.ingestRun(dtoWithTimes, VALID_TOKEN);

      const createArg = (runRepo.create.mock.calls as IacRun[][])[0][0];
      expect(createArg.startedAt).toEqual(new Date("2024-06-01T09:00:00Z"));
      expect(createArg.finishedAt).toEqual(new Date("2024-06-01T09:05:00Z"));
      expect(createArg.durationMs).toBe(300000);
    });

    it("should use finishedAt as startedAt when startedAt is absent but finishedAt is present", async () => {
      const dtoFinishedOnly: IngestRunDto = {
        stackName: "core-networking",
        environment: "production",
        type: IacRunType.APPLY,
        status: IacRunStatus.SUCCEEDED,
        finishedAt: "2024-06-01T09:05:00Z",
      };
      stackRepo.findOne.mockResolvedValue(mockStack);
      runRepo.create.mockImplementation(
        (data: Partial<IacRun>) => data as IacRun,
      );
      runRepo.save.mockImplementation((r: IacRun) => Promise.resolve(r));

      await service.ingestRun(dtoFinishedOnly, VALID_TOKEN);

      const createArg = (runRepo.create.mock.calls as IacRun[][])[0][0];
      expect(createArg.startedAt).toEqual(new Date("2024-06-01T09:05:00Z"));
      expect(createArg.finishedAt).toEqual(new Date("2024-06-01T09:05:00Z"));
    });

    it("should default optional run fields to null when omitted", async () => {
      const dtoMinimal: IngestRunDto = {
        stackName: "core-networking",
        environment: "production",
        type: IacRunType.PLAN,
        status: IacRunStatus.SUCCEEDED,
      };
      stackRepo.findOne.mockResolvedValue(mockStack);
      runRepo.create.mockImplementation(
        (data: Partial<IacRun>) => data as IacRun,
      );
      runRepo.save.mockImplementation((r: IacRun) => Promise.resolve(r));

      await service.ingestRun(dtoMinimal, VALID_TOKEN);

      const createArg = (runRepo.create.mock.calls as IacRun[][])[0][0];
      expect(createArg.provider).toBeNull();
      expect(createArg.resourceChanges).toBeNull();
      expect(createArg.triggeredBy).toBeNull();
      expect(createArg.pipelineUrl).toBeNull();
      expect(createArg.finishedAt).toBeNull();
      expect(createArg.durationMs).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // importStacks
  // ---------------------------------------------------------------------------
  describe("importStacks", () => {
    const dto: ImportStacksDto = {
      stacks: [
        {
          name: "core-networking",
          environment: "production",
          provider: "terraform",
          repositoryUrl: "https://github.com/acme/infra",
        },
        {
          name: "core-database",
          environment: "staging",
          provider: "opentofu",
        },
      ],
    };

    it("should throw UnauthorizedException for an invalid token", async () => {
      await expect(
        service.importStacks(dto, "bad-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should create new stacks that do not exist with autoImported true", async () => {
      stackRepo.findOne.mockResolvedValue(null);
      stackRepo.create.mockImplementation(
        (data: Partial<IacStack>) => data as IacStack,
      );
      stackRepo.save.mockImplementation((s: IacStack) =>
        Promise.resolve({ id: "new-id", ...s }),
      );

      const result = await service.importStacks(dto, VALID_TOKEN);

      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(stackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ autoImported: true }),
      );
    });

    it("should update stacks that already exist", async () => {
      stackRepo.findOne.mockResolvedValue({ ...mockStack });
      stackRepo.save.mockResolvedValue(mockStack);

      const result = await service.importStacks(dto, VALID_TOKEN);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(2);
    });

    it("should preserve componentId on existing stacks", async () => {
      const existingWithComponent = {
        ...mockStack,
        componentId: "comp-uuid-kept",
        externalToolUrl: "https://existing-tool-url",
      };
      stackRepo.findOne.mockResolvedValue(existingWithComponent);
      stackRepo.save.mockImplementation((s: IacStack) => Promise.resolve(s));

      await service.importStacks(dto, VALID_TOKEN);

      const savedArg = (stackRepo.save.mock.calls as IacStack[][])[0][0];
      expect(savedArg.componentId).toBe("comp-uuid-kept");
    });

    it("should update externalToolUrl when provided in import item", async () => {
      const existing = { ...mockStack, externalToolUrl: null };
      stackRepo.findOne.mockResolvedValue(existing);
      stackRepo.save.mockImplementation((s: IacStack) => Promise.resolve(s));

      const dtoWithUrl: ImportStacksDto = {
        stacks: [
          {
            name: "core-networking",
            environment: "production",
            externalToolUrl: "https://atlantis.example.com/runs/42",
          },
        ],
      };

      await service.importStacks(dtoWithUrl, VALID_TOKEN);

      const savedArg = (stackRepo.save.mock.calls as IacStack[][])[0][0];
      expect(savedArg.externalToolUrl).toBe(
        "https://atlantis.example.com/runs/42",
      );
    });

    it("should set externalToolUrl on newly created stacks when provided", async () => {
      stackRepo.findOne.mockResolvedValue(null);
      stackRepo.create.mockImplementation(
        (data: Partial<IacStack>) => data as IacStack,
      );
      stackRepo.save.mockImplementation((s: IacStack) => Promise.resolve(s));

      const dtoNewWithUrl: ImportStacksDto = {
        stacks: [
          {
            name: "new-stack",
            environment: "production",
            externalToolUrl: "https://atlantis.example.com/runs/1",
          },
        ],
      };

      await service.importStacks(dtoNewWithUrl, VALID_TOKEN);

      const createArg = (stackRepo.create.mock.calls as IacStack[][])[0][0];
      expect(createArg.externalToolUrl).toBe(
        "https://atlantis.example.com/runs/1",
      );
    });

    it("should return correct counts when some stacks exist and some do not", async () => {
      stackRepo.findOne
        .mockResolvedValueOnce(mockStack) // first stack exists
        .mockResolvedValueOnce(null); // second stack does not
      stackRepo.create.mockImplementation(
        (data: Partial<IacStack>) => data as IacStack,
      );
      stackRepo.save.mockImplementation((s: IacStack) => Promise.resolve(s));

      const result = await service.importStacks(dto, VALID_TOKEN);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // ingestModuleDrift
  // ---------------------------------------------------------------------------
  describe("ingestModuleDrift", () => {
    const dto: IngestModuleDriftDto = {
      modules: [
        {
          stackPath: "stacks/networking/main.tf",
          moduleName: "terraform-aws-modules/vpc/aws",
          sourceUrl:
            "https://registry.terraform.io/terraform-aws-modules/vpc/aws",
          currentRef: "v3.14.0",
          latestRef: "v3.19.0",
        },
        {
          stackPath: "stacks/database/main.tf",
          moduleName: "terraform-aws-modules/rds/aws",
          sourceUrl:
            "https://registry.terraform.io/terraform-aws-modules/rds/aws",
          currentRef: "main",
          latestRef: "v5.0.0",
        },
      ],
    };

    it("should throw UnauthorizedException for an invalid token", async () => {
      await expect(
        service.ingestModuleDrift(dto, "bad-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should create drift records for each module", async () => {
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve({
          id: "drift-id",
          ...d,
        }),
      );

      await service.ingestModuleDrift(dto, VALID_TOKEN);

      expect(driftRepo.create).toHaveBeenCalledTimes(2);
      expect(driftRepo.save).toHaveBeenCalledTimes(2);
    });

    it("should compute versionsBehind correctly for semver refs (v3.14.0 -> v3.19.0 = 5)", async () => {
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve(d),
      );

      await service.ingestModuleDrift(dto, VALID_TOKEN);

      const firstCreateArg = (
        driftRepo.create.mock.calls as IacModuleDrift[][]
      )[0][0];
      expect(firstCreateArg.versionsBehind).toBe(5);
    });

    it("should default versionsBehind to 1 for non-semver refs", async () => {
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve(d),
      );

      await service.ingestModuleDrift(dto, VALID_TOKEN);

      const secondCreateArg = (
        driftRepo.create.mock.calls as IacModuleDrift[][]
      )[1][0];
      // "main" vs "v5.0.0" — non-semver current ref defaults to 1
      expect(secondCreateArg.versionsBehind).toBe(1);
    });

    it("should return 0 versionsBehind when latest is not newer than current", async () => {
      const dtoPinned: IngestModuleDriftDto = {
        modules: [
          {
            stackPath: "stacks/networking/main.tf",
            moduleName: "terraform-aws-modules/vpc/aws",
            sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
            currentRef: "v3.19.0",
            latestRef: "v3.14.0",
          },
        ],
      };
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve(d),
      );

      await service.ingestModuleDrift(dtoPinned, VALID_TOKEN);

      const createArg = (
        driftRepo.create.mock.calls as IacModuleDrift[][]
      )[0][0];
      expect(createArg.versionsBehind).toBe(0);
    });

    it("should compute versionsBehind by patch only when major and minor are equal", async () => {
      const dtoPatch: IngestModuleDriftDto = {
        modules: [
          {
            stackPath: "stacks/networking/main.tf",
            moduleName: "terraform-aws-modules/vpc/aws",
            sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
            currentRef: "v3.14.0",
            latestRef: "v3.14.2",
          },
        ],
      };
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve(d),
      );

      await service.ingestModuleDrift(dtoPatch, VALID_TOKEN);

      const createArg = (
        driftRepo.create.mock.calls as IacModuleDrift[][]
      )[0][0];
      expect(createArg.versionsBehind).toBe(2);
    });

    it("should compute versionsBehind by major when major versions differ", async () => {
      const dtoMajor: IngestModuleDriftDto = {
        modules: [
          {
            stackPath: "stacks/networking/main.tf",
            moduleName: "terraform-aws-modules/vpc/aws",
            sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
            currentRef: "v2.0.0",
            latestRef: "v4.0.0",
          },
        ],
      };
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve(d),
      );

      await service.ingestModuleDrift(dtoMajor, VALID_TOKEN);

      const createArg = (
        driftRepo.create.mock.calls as IacModuleDrift[][]
      )[0][0];
      expect(createArg.versionsBehind).toBe(2);
    });

    it("should default versionsBehind to 1 when latestRef contains non-numeric parts", async () => {
      const dtoNaN: IngestModuleDriftDto = {
        modules: [
          {
            stackPath: "stacks/networking/main.tf",
            moduleName: "terraform-aws-modules/vpc/aws",
            sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
            currentRef: "v3.14.0",
            latestRef: "v3.14.x",
          },
        ],
      };
      driftRepo.create.mockImplementation(
        (data: Partial<IacModuleDrift>) => data as IacModuleDrift,
      );
      driftRepo.save.mockImplementation((d: IacModuleDrift) =>
        Promise.resolve(d),
      );

      await service.ingestModuleDrift(dtoNaN, VALID_TOKEN);

      const createArg = (
        driftRepo.create.mock.calls as IacModuleDrift[][]
      )[0][0];
      expect(createArg.versionsBehind).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getStackRuns
  // ---------------------------------------------------------------------------
  describe("getStackRuns", () => {
    it("should return paginated runs sorted by startedAt DESC", async () => {
      runRepo.findAndCount.mockResolvedValue([[mockRun], 1]);

      const result = await service.getStackRuns("stack-uuid-1", 1, 20);

      expect(runRepo.findAndCount).toHaveBeenCalledWith({
        where: { stackId: "stack-uuid-1" },
        order: { startedAt: "DESC" },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should apply correct skip offset for page 2", async () => {
      runRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getStackRuns("stack-uuid-1", 2, 10);

      expect(runRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getDashboard
  // ---------------------------------------------------------------------------
  describe("getDashboard", () => {
    /**
     * Creates a chainable mock for runRepository.createQueryBuilder that
     * invokes the innerJoin subquery callback so Istanbul tracks that branch,
     * and ultimately resolves to the provided array of runs via getMany().
     */
    function mockQueryBuilder(runs: IacRun[]) {
      const subQb = {
        subQuery: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
      };
      const qb: Record<string, jest.Mock> = {
        innerJoin: jest.fn().mockImplementation((callbackOrEntity) => {
          if (typeof callbackOrEntity === "function") {
            (callbackOrEntity as (qb: unknown) => void)(subQb);
          }
          return qb;
        }),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(runs),
      };
      runRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it("should group stacks by environment", async () => {
      const stagingStack: IacStack = {
        ...mockStack,
        id: "stack-uuid-2",
        name: "core-database",
        environment: "staging",
      };
      const stagingRun: IacRun = { ...mockRun, stackId: "stack-uuid-2" };
      stackRepo.find.mockResolvedValue([mockStack, stagingStack]);
      mockQueryBuilder([mockRun, stagingRun]);

      const result = await service.getDashboard();

      expect(result.environments).toContain("production");
      expect(result.environments).toContain("staging");
      expect(result.stacksByEnvironment["production"]).toHaveLength(1);
      expect(result.stacksByEnvironment["staging"]).toHaveLength(1);
    });

    it("should count failed last runs", async () => {
      const failedRun: IacRun = { ...mockRun, status: IacRunStatus.FAILED };
      stackRepo.find.mockResolvedValue([mockStack]);
      mockQueryBuilder([failedRun]);

      const result = await service.getDashboard();

      expect(result.failedLastRun).toBe(1);
    });

    it("should surface failed stacks first within each environment", async () => {
      const failedStack: IacStack = {
        ...mockStack,
        id: "stack-uuid-3",
        name: "broken-stack",
      };
      const failedRun: IacRun = {
        ...mockRun,
        stackId: "stack-uuid-3",
        status: IacRunStatus.FAILED,
      };
      stackRepo.find.mockResolvedValue([mockStack, failedStack]);
      mockQueryBuilder([mockRun, failedRun]);

      const result = await service.getDashboard();

      const envStacks = result.stacksByEnvironment["production"];
      expect(envStacks[0].lastRunStatus).toBe(IacRunStatus.FAILED);
    });

    it("should return zero totalStacks and no environments when no stacks exist", async () => {
      stackRepo.find.mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result.totalStacks).toBe(0);
      expect(result.environments).toHaveLength(0);
      expect(result.failedLastRun).toBe(0);
    });

    it("should show null lastRunStatus for stacks with no recorded runs", async () => {
      stackRepo.find.mockResolvedValue([mockStack]);
      mockQueryBuilder([]);

      const result = await service.getDashboard();

      const envStack = result.stacksByEnvironment["production"][0];
      expect(envStack.lastRunStatus).toBeNull();
      expect(envStack.lastRunAt).toBeNull();
      expect(envStack.lastRunType).toBeNull();
      expect(envStack.resourceChanges).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // listStacks (FARM-S277 / FARM-T244)
  // ---------------------------------------------------------------------------
  describe("listStacks", () => {
    /**
     * Sets up a chainable QueryBuilder mock that returns the provided runs
     * from getMany(), mirroring the fetchLastRunMap subquery structure.
     */
    function mockLastRunQb(runs: IacRun[]) {
      const subQb = {
        subQuery: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
      };
      const qb: Record<string, jest.Mock> = {
        innerJoin: jest.fn().mockImplementation((callbackOrEntity) => {
          if (typeof callbackOrEntity === "function") {
            (callbackOrEntity as (qb: unknown) => void)(subQb);
          }
          return qb;
        }),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(runs),
      };
      runRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it("should return an empty array when no stacks match", async () => {
      stackRepo.find.mockResolvedValue([]);

      const result = await service.listStacks({});

      expect(result).toEqual([]);
      expect(runRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should return all stacks with lastRun when no filter is provided", async () => {
      stackRepo.find.mockResolvedValue([mockStack]);
      mockLastRunQb([mockRun]);

      const result = await service.listStacks({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockStack.id);
      expect(result[0].lastRun).not.toBeNull();
      expect(result[0].lastRun?.status).toBe(mockRun.status);
    });

    it("should pass componentId filter to repository.find (FARM-ST400)", async () => {
      stackRepo.find.mockResolvedValue([mockStack]);
      mockLastRunQb([mockRun]);

      await service.listStacks({ componentId: "comp-uuid-1234" });

      expect(stackRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { componentId: "comp-uuid-1234" },
        }),
      );
    });

    it("should pass environment filter to repository.find (FARM-ST401)", async () => {
      stackRepo.find.mockResolvedValue([mockStack]);
      mockLastRunQb([mockRun]);

      await service.listStacks({ environment: "production" });

      expect(stackRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { environment: "production" },
        }),
      );
    });

    it("should set lastRun to null for stacks with no runs", async () => {
      stackRepo.find.mockResolvedValue([mockStack]);
      mockLastRunQb([]);

      const result = await service.listStacks({});

      expect(result[0].lastRun).toBeNull();
    });

    it("should return stacks ordered by environment then name", async () => {
      stackRepo.find.mockResolvedValue([mockStack]);
      mockLastRunQb([]);

      await service.listStacks({});

      expect(stackRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { environment: "ASC", name: "ASC" },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getStack (FARM-S277 / FARM-T245)
  // ---------------------------------------------------------------------------
  describe("getStack", () => {
    function mockLastRunQb(runs: IacRun[]) {
      const subQb = {
        subQuery: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
      };
      const qb: Record<string, jest.Mock> = {
        innerJoin: jest.fn().mockImplementation((callbackOrEntity) => {
          if (typeof callbackOrEntity === "function") {
            (callbackOrEntity as (qb: unknown) => void)(subQb);
          }
          return qb;
        }),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(runs),
      };
      runRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it("should return a StackDetailDto when the stack exists", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      mockLastRunQb([mockRun]);

      const result = await service.getStack("stack-uuid-1");

      expect(result.id).toBe(mockStack.id);
      expect(result.name).toBe(mockStack.name);
      expect(result.lastRun?.id).toBe(mockRun.id);
    });

    it("should throw NotFoundException when the stack does not exist", async () => {
      stackRepo.findOne.mockResolvedValue(null);

      await expect(service.getStack("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set lastRun to null when no runs exist for the stack", async () => {
      stackRepo.findOne.mockResolvedValue(mockStack);
      mockLastRunQb([]);

      const result = await service.getStack("stack-uuid-1");

      expect(result.lastRun).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getModuleDrift
  // ---------------------------------------------------------------------------
  describe("getModuleDrift", () => {
    it("should return all drift records ordered by detectedAt DESC", async () => {
      const drift: IacModuleDrift = {
        id: "drift-uuid-1",
        stackPath: "stacks/main.tf",
        moduleName: "terraform-aws-modules/vpc/aws",
        sourceUrl:
          "https://registry.terraform.io/terraform-aws-modules/vpc/aws",
        currentRef: "v3.14.0",
        latestRef: "v3.19.0",
        versionsBehind: 5,
        detectedAt: new Date("2024-01-01T00:00:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };
      driftRepo.find.mockResolvedValue([drift]);

      const result = await service.getModuleDrift();

      expect(driftRepo.find).toHaveBeenCalledWith({
        order: { detectedAt: "DESC" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].moduleName).toBe(drift.moduleName);
    });
  });
});
