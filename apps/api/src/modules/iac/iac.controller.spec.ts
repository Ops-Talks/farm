import { Test, TestingModule } from "@nestjs/testing";
import { IacController } from "./iac.controller";
import { IacService } from "./iac.service";
import { IacResourceService } from "./iac-resource.service";
import { IacRunType, IacRunStatus } from "./entities/iac-run.entity";
import type { IacRun } from "./entities/iac-run.entity";
import type { IacModuleDrift } from "./entities/iac-module-drift.entity";
import type { DashboardDto } from "./dto/dashboard.dto";

describe("IacController", () => {
  let controller: IacController;
  let service: IacService;

  const mockRun: IacRun = {
    id: "run-uuid-1",
    stackId: "stack-uuid-1",
    stack: {} as never,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDashboard: DashboardDto = {
    totalStacks: 2,
    failedLastRun: 0,
    environments: ["production"],
    stacksByEnvironment: { production: [] },
  };

  const mockDrift: IacModuleDrift = {
    id: "drift-uuid-1",
    stackPath: "stacks/networking/main.tf",
    moduleName: "terraform-aws-modules/vpc/aws",
    sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
    currentRef: "v3.14.0",
    latestRef: "v3.19.0",
    versionsBehind: 5,
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IacController],
      providers: [
        {
          provide: IacService,
          useValue: {
            ingestRun: jest.fn().mockResolvedValue(mockRun),
            importStacks: jest
              .fn()
              .mockResolvedValue({ created: 1, updated: 0 }),
            ingestModuleDrift: jest.fn().mockResolvedValue(undefined),
            getStackRuns: jest
              .fn()
              .mockResolvedValue({ data: [mockRun], total: 1 }),
            getDashboard: jest.fn().mockResolvedValue(mockDashboard),
            getModuleDrift: jest.fn().mockResolvedValue([mockDrift]),
          },
        },
        {
          provide: IacResourceService,
          useValue: {
            ingestResources: jest.fn().mockResolvedValue(undefined),
            getResources: jest
              .fn()
              .mockResolvedValue({ resources: [], dependencies: [] }),
          },
        },
      ],
    }).compile();

    controller = module.get<IacController>(IacController);
    service = module.get<IacService>(IacService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // ingestRun
  // ---------------------------------------------------------------------------
  describe("ingestRun", () => {
    const dto = {
      stackName: "core-networking",
      environment: "production",
      type: IacRunType.PLAN,
      status: IacRunStatus.SUCCEEDED,
    };

    it("should delegate to IacService with the extracted token", async () => {
      const result = await controller.ingestRun("Bearer my-secret-token", dto);
      expect(service.ingestRun).toHaveBeenCalledWith(dto, "my-secret-token");
      expect(result).toEqual(mockRun);
    });

    it("should pass an empty string when Authorization header is absent", async () => {
      await controller.ingestRun(undefined, dto);
      expect(service.ingestRun).toHaveBeenCalledWith(dto, "");
    });

    it("should pass an empty string when Authorization header is malformed", async () => {
      await controller.ingestRun("Token abc123", dto);
      expect(service.ingestRun).toHaveBeenCalledWith(dto, "");
    });
  });

  // ---------------------------------------------------------------------------
  // importStacks
  // ---------------------------------------------------------------------------
  describe("importStacks", () => {
    const dto = {
      stacks: [{ name: "core-networking", environment: "production" }],
    };

    it("should delegate to IacService with the extracted token", async () => {
      const result = await controller.importStacks(
        "Bearer my-secret-token",
        dto,
      );
      expect(service.importStacks).toHaveBeenCalledWith(dto, "my-secret-token");
      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it("should pass an empty string when Authorization header is absent", async () => {
      await controller.importStacks(undefined, dto);
      expect(service.importStacks).toHaveBeenCalledWith(dto, "");
    });
  });

  // ---------------------------------------------------------------------------
  // ingestModuleDrift
  // ---------------------------------------------------------------------------
  describe("ingestModuleDrift", () => {
    const dto = {
      modules: [
        {
          stackPath: "stacks/main.tf",
          moduleName: "terraform-aws-modules/vpc/aws",
          sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
          currentRef: "v3.14.0",
          latestRef: "v3.19.0",
        },
      ],
    };

    it("should delegate to IacService with the extracted token", async () => {
      await controller.ingestModuleDrift("Bearer my-secret-token", dto);
      expect(service.ingestModuleDrift).toHaveBeenCalledWith(
        dto,
        "my-secret-token",
      );
    });

    it("should pass an empty string when Authorization header is absent", async () => {
      await controller.ingestModuleDrift(undefined, dto);
      expect(service.ingestModuleDrift).toHaveBeenCalledWith(dto, "");
    });
  });

  // ---------------------------------------------------------------------------
  // getStackRuns
  // ---------------------------------------------------------------------------
  describe("getStackRuns", () => {
    it("should return paginated runs for the given stack", async () => {
      const result = await controller.getStackRuns("stack-uuid-1", 1, 20);
      expect(service.getStackRuns).toHaveBeenCalledWith("stack-uuid-1", 1, 20);
      expect(result).toEqual({ data: [mockRun], total: 1 });
    });

    it("should cap limit at 100", async () => {
      await controller.getStackRuns("stack-uuid-1", 1, 500);
      expect(service.getStackRuns).toHaveBeenCalledWith("stack-uuid-1", 1, 100);
    });

    it("should coerce string query params to numbers", async () => {
      await controller.getStackRuns(
        "stack-uuid-1",
        "2" as never,
        "50" as never,
      );
      expect(service.getStackRuns).toHaveBeenCalledWith("stack-uuid-1", 2, 50);
    });

    it("should use default page=1 and limit=20 when no params are provided", async () => {
      await (controller.getStackRuns as (id: string) => Promise<unknown>)(
        "stack-uuid-1",
      );
      expect(service.getStackRuns).toHaveBeenCalledWith("stack-uuid-1", 1, 20);
    });
  });

  // ---------------------------------------------------------------------------
  // getDashboard
  // ---------------------------------------------------------------------------
  describe("getDashboard", () => {
    it("should return the dashboard DTO", async () => {
      const result = await controller.getDashboard();
      expect(service.getDashboard).toHaveBeenCalled();
      expect(result).toEqual(mockDashboard);
    });
  });

  // ---------------------------------------------------------------------------
  // getModuleDrift
  // ---------------------------------------------------------------------------
  describe("getModuleDrift", () => {
    it("should return all drift records", async () => {
      const result = await controller.getModuleDrift();
      expect(service.getModuleDrift).toHaveBeenCalled();
      expect(result).toEqual([mockDrift]);
    });
  });
});

// ---------------------------------------------------------------------------
// IacController — stack endpoints (FARM-S277)
// ---------------------------------------------------------------------------
describe("IacController (stack endpoints)", () => {
  let controller: IacController;
  let service: IacService;

  const mockStackDetail = {
    id: "stack-uuid-1",
    name: "core-networking",
    environment: "production",
    provider: "terraform",
    repositoryUrl: "https://github.com/acme/infra",
    basePath: "stacks/networking",
    externalToolUrl: null,
    componentId: "comp-uuid-1",
    autoImported: false,
    lastRun: {
      id: "run-uuid-1",
      status: "succeeded",
      type: "plan",
      startedAt: new Date("2024-01-01T10:00:00Z"),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IacController],
      providers: [
        {
          provide: IacService,
          useValue: {
            listStacks: jest.fn().mockResolvedValue([mockStackDetail]),
            getStack: jest.fn().mockResolvedValue(mockStackDetail),
            ingestRun: jest.fn(),
            importStacks: jest.fn(),
            ingestModuleDrift: jest.fn(),
            getStackRuns: jest.fn(),
            getDashboard: jest.fn(),
            getModuleDrift: jest.fn(),
          },
        },
        {
          provide: IacResourceService,
          useValue: {
            ingestResources: jest.fn().mockResolvedValue(undefined),
            getResources: jest
              .fn()
              .mockResolvedValue({ resources: [], dependencies: [] }),
          },
        },
      ],
    }).compile();

    controller = module.get<IacController>(IacController);
    service = module.get<IacService>(IacService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // listStacks
  // -------------------------------------------------------------------------
  describe("listStacks", () => {
    it("should delegate to IacService.listStacks and return the result", async () => {
      const query = { environment: "production" };
      const result = await controller.listStacks(query);

      expect(service.listStacks).toHaveBeenCalledWith(query);
      expect(result).toEqual([mockStackDetail]);
    });

    it("should pass an empty query object when no filters are provided", async () => {
      await controller.listStacks({});
      expect(service.listStacks).toHaveBeenCalledWith({});
    });
  });

  // -------------------------------------------------------------------------
  // getStack
  // -------------------------------------------------------------------------
  describe("getStack", () => {
    it("should delegate to IacService.getStack with the provided id", async () => {
      const result = await controller.getStack("stack-uuid-1");

      expect(service.getStack).toHaveBeenCalledWith("stack-uuid-1");
      expect(result).toEqual(mockStackDetail);
    });
  });
});

// ---------------------------------------------------------------------------
// FARM-S286 — Resource endpoints
// ---------------------------------------------------------------------------

describe("IacController — resource endpoints (FARM-S286)", () => {
  let controller: IacController;
  let iacResourceService: {
    ingestResources: jest.Mock;
    getResources: jest.Mock;
  };

  const mockResourceMap = {
    resources: [
      {
        address: "aws_instance.web",
        resourceType: "aws_instance",
        resourceName: "web",
        provider: "aws",
      },
    ],
    dependencies: [],
  };

  beforeEach(async () => {
    iacResourceService = {
      ingestResources: jest.fn().mockResolvedValue(undefined),
      getResources: jest.fn().mockResolvedValue(mockResourceMap),
    };

    const module = await Test.createTestingModule({
      controllers: [IacController],
      providers: [
        {
          provide: IacService,
          useValue: {
            ingestRun: jest.fn(),
            importStacks: jest.fn(),
            ingestModuleDrift: jest.fn(),
            getStackRuns: jest.fn(),
            getDashboard: jest.fn(),
            getModuleDrift: jest.fn(),
            getStack: jest.fn(),
          },
        },
        { provide: IacResourceService, useValue: iacResourceService },
      ],
    }).compile();

    controller = module.get<IacController>(IacController);
  });

  afterEach(() => jest.clearAllMocks());

  describe("ingestResources", () => {
    it("delegates to IacResourceService.ingestResources", async () => {
      const dto = { resources: [], dependencies: [] };

      await controller.ingestResources(
        "stack-uuid-1",
        "Bearer test-token",
        dto,
      );

      expect(iacResourceService.ingestResources).toHaveBeenCalledWith(
        "stack-uuid-1",
        dto,
        "test-token",
      );
    });

    it("returns undefined (void / 201)", async () => {
      const dto = { resources: [], dependencies: [] };
      const result = await controller.ingestResources(
        "stack-uuid-1",
        "Bearer test-token",
        dto,
      );
      expect(result).toBeUndefined();
    });
  });

  describe("getResources", () => {
    it("delegates to IacResourceService.getResources", async () => {
      const result = await controller.getResources("stack-uuid-1");

      expect(iacResourceService.getResources).toHaveBeenCalledWith(
        "stack-uuid-1",
      );
      expect(result).toEqual(mockResourceMap);
    });
  });
});
