import { Test, TestingModule } from "@nestjs/testing";
import { IacController } from "./iac.controller";
import { IacService } from "./iac.service";
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
      const result = await controller.ingestRun(
        "Bearer my-secret-token",
        dto as never,
      );
      expect(service.ingestRun).toHaveBeenCalledWith(dto, "my-secret-token");
      expect(result).toEqual(mockRun);
    });

    it("should pass an empty string when Authorization header is absent", async () => {
      await controller.ingestRun(undefined, dto as never);
      expect(service.ingestRun).toHaveBeenCalledWith(dto, "");
    });

    it("should pass an empty string when Authorization header is malformed", async () => {
      await controller.ingestRun("Token abc123", dto as never);
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
        dto as never,
      );
      expect(service.importStacks).toHaveBeenCalledWith(dto, "my-secret-token");
      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it("should pass an empty string when Authorization header is absent", async () => {
      await controller.importStacks(undefined, dto as never);
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
      await controller.ingestModuleDrift(
        "Bearer my-secret-token",
        dto as never,
      );
      expect(service.ingestModuleDrift).toHaveBeenCalledWith(
        dto,
        "my-secret-token",
      );
    });

    it("should pass an empty string when Authorization header is absent", async () => {
      await controller.ingestModuleDrift(undefined, dto as never);
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
