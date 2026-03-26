import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PipelinesController } from "./pipelines.controller";
import { PipelinesService } from "./pipelines.service";
import { PipelineRunStatus } from "./entities/pipeline-run.entity";
import { PaginatedResponseDto } from "../../common/dto";

describe("PipelinesController", () => {
  let controller: PipelinesController;
  let service: PipelinesService;

  const mockPipeline = {
    id: "pipeline-uuid-1",
    name: "deploy-to-production",
    description: "Deploy main service to production",
    stages: [],
    organizationId: null,
    createdBy: "user-uuid-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRun = {
    id: "run-uuid-1",
    pipelineId: "pipeline-uuid-1",
    status: PipelineRunStatus.QUEUED,
    triggeredBy: "user-uuid-1",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    logs: null,
    stageResults: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: { userId: "user-uuid-1" },
  } as unknown as import("../../common/interfaces/request-with-org.interface").RequestWithOrg;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelinesController],
      providers: [
        {
          provide: PipelinesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPipeline),
            findAll: jest.fn().mockResolvedValue([[mockPipeline], 1]),
            findOne: jest.fn().mockResolvedValue(mockPipeline),
            update: jest.fn().mockResolvedValue(mockPipeline),
            remove: jest.fn().mockResolvedValue(undefined),
            triggerRun: jest.fn().mockResolvedValue(mockRun),
            findRuns: jest.fn().mockResolvedValue([[mockRun], 1]),
            findRun: jest.fn().mockResolvedValue(mockRun),
            approveRun: jest.fn().mockResolvedValue({
              ...mockRun,
              status: PipelineRunStatus.RUNNING,
            }),
            rejectRun: jest.fn().mockResolvedValue({
              ...mockRun,
              status: PipelineRunStatus.FAILED,
            }),
            cancelRun: jest.fn().mockResolvedValue({
              ...mockRun,
              status: PipelineRunStatus.CANCELLED,
            }),
            getRunStats: jest.fn().mockResolvedValue({
              total: 0,
              byStatus: {},
              successRate: 0,
              avgDurationMs: null,
              lastRunAt: null,
            }),
            compareRuns: jest
              .fn()
              .mockResolvedValue({ runA: {}, runB: {}, stageDiff: [] }),
          },
        },
      ],
    }).compile();

    controller = module.get<PipelinesController>(PipelinesController);
    service = module.get<PipelinesService>(PipelinesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a pipeline", async () => {
      const result = await controller.create(
        { name: "deploy-to-production" },
        mockRequest,
      );
      expect(result).toEqual(mockPipeline);
      expect(service.create).toHaveBeenCalledWith(
        { name: "deploy-to-production" },
        "user-uuid-1",
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated pipelines", async () => {
      const result = await controller.findAll({ skip: 0, take: 20 });
      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(service.findAll).toHaveBeenCalledWith(0, 20, undefined);
    });
  });

  describe("findOne", () => {
    it("should return a pipeline by id", async () => {
      const result = await controller.findOne("pipeline-uuid-1");
      expect(result).toEqual(mockPipeline);
      expect(service.findOne).toHaveBeenCalledWith("pipeline-uuid-1");
    });
  });

  describe("update", () => {
    it("should update a pipeline", async () => {
      const result = await controller.update("pipeline-uuid-1", {
        description: "Updated",
      });
      expect(result).toEqual(mockPipeline);
      expect(service.update).toHaveBeenCalledWith("pipeline-uuid-1", {
        description: "Updated",
      });
    });
  });

  describe("remove", () => {
    it("should remove a pipeline", async () => {
      await controller.remove("pipeline-uuid-1");
      expect(service.remove).toHaveBeenCalledWith("pipeline-uuid-1");
    });
  });

  describe("trigger", () => {
    it("should trigger a pipeline run", async () => {
      const result = await controller.trigger(
        "pipeline-uuid-1",
        {},
        mockRequest,
      );
      expect(result).toEqual(mockRun);
      expect(service.triggerRun).toHaveBeenCalledWith(
        "pipeline-uuid-1",
        "user-uuid-1",
      );
    });
  });

  describe("findRuns", () => {
    it("should return paginated pipeline runs", async () => {
      const query = { skip: 0, take: 20 };
      const result = await controller.findRuns("pipeline-uuid-1", query);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(service.findRuns).toHaveBeenCalledWith("pipeline-uuid-1", query);
    });
  });

  describe("findRun", () => {
    it("should return a specific run", async () => {
      const result = await controller.findRun("pipeline-uuid-1", "run-uuid-1");
      expect(result).toEqual(mockRun);
      expect(service.findRun).toHaveBeenCalledWith(
        "pipeline-uuid-1",
        "run-uuid-1",
      );
    });
  });

  describe("approveRun", () => {
    it("should approve a run and return the updated run", async () => {
      const result = await controller.approveRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        mockRequest,
      );
      expect(result.status).toBe(PipelineRunStatus.RUNNING);
      expect(service.approveRun).toHaveBeenCalledWith(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );
    });
  });

  describe("rejectRun", () => {
    it("should reject a run and return the updated run", async () => {
      const result = await controller.rejectRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        mockRequest,
      );
      expect(result.status).toBe(PipelineRunStatus.FAILED);
      expect(service.rejectRun).toHaveBeenCalledWith(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );
    });
  });

  describe("cancelRun", () => {
    it("should cancel a run and return the updated run", async () => {
      const result = await controller.cancelRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        mockRequest,
      );
      expect(result.status).toBe(PipelineRunStatus.CANCELLED);
      expect(service.cancelRun).toHaveBeenCalledWith(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );
    });
  });

  describe("getRunStats", () => {
    it("should return run statistics for a pipeline", async () => {
      const mockStats = {
        total: 5,
        byStatus: {
          queued: 0,
          running: 0,
          succeeded: 4,
          failed: 1,
          cancelled: 0,
          waiting_approval: 0,
        },
        successRate: 80,
        avgDurationMs: 30000,
        lastRunAt: new Date(),
      };
      jest
        .spyOn(service, "getRunStats" as keyof PipelinesService)
        .mockResolvedValue(mockStats as never);

      const result = await controller.getRunStats("pipeline-uuid-1");

      expect(result).toEqual(mockStats);
    });
  });

  describe("compareRuns", () => {
    it("should compare two runs and return snapshots + diff", async () => {
      const mockComparison = {
        runA: { id: "run-a", status: PipelineRunStatus.SUCCEEDED },
        runB: { id: "run-b", status: PipelineRunStatus.FAILED },
        stageDiff: [],
      };
      jest
        .spyOn(service, "compareRuns" as keyof PipelinesService)
        .mockResolvedValue(mockComparison as never);

      const result = await controller.compareRuns(
        "pipeline-uuid-1",
        "run-a",
        "run-b",
      );

      expect(result).toEqual(mockComparison);
    });

    it("should throw BadRequestException when runIdA is missing", async () => {
      await expect(
        controller.compareRuns("pipeline-uuid-1", "", "run-b"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when runIdB is missing", async () => {
      await expect(
        controller.compareRuns("pipeline-uuid-1", "run-a", ""),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("create — req.user missing (anonymous fallback)", () => {
    it("should use 'anonymous' when req.user is undefined", async () => {
      const requestWithNoUser =
        {} as unknown as import("../../common/interfaces/request-with-org.interface").RequestWithOrg;
      await controller.create({ name: "new-pipeline" }, requestWithNoUser);
      expect(service.create).toHaveBeenCalledWith(
        { name: "new-pipeline" },
        "anonymous",
      );
    });
  });

  describe("trigger — req.user missing (anonymous fallback)", () => {
    it("should use 'anonymous' when req.user is undefined", async () => {
      const requestWithNoUser =
        {} as unknown as import("../../common/interfaces/request-with-org.interface").RequestWithOrg;
      await controller.trigger("pipeline-uuid-1", {}, requestWithNoUser);
      expect(service.triggerRun).toHaveBeenCalledWith(
        "pipeline-uuid-1",
        "anonymous",
      );
    });
  });

  describe("findAll — skip/take ?? defaults", () => {
    it("should default skip to 0 and take to 20 when not provided", async () => {
      const result = await controller.findAll({});
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });

  describe("findRuns — skip/take ?? defaults", () => {
    it("should default skip to 0 and take to 20 when not provided", async () => {
      const result = await controller.findRuns("pipeline-uuid-1", {});
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });
});
