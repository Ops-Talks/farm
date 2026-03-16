import { Test, TestingModule } from "@nestjs/testing";
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
    user: { id: "user-uuid-1" },
  } as unknown as import("express").Request;

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
            findRuns: jest.fn().mockResolvedValue([mockRun]),
            findRun: jest.fn().mockResolvedValue(mockRun),
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
    it("should return pipeline runs", async () => {
      const result = await controller.findRuns("pipeline-uuid-1");
      expect(result).toHaveLength(1);
      expect(service.findRuns).toHaveBeenCalledWith("pipeline-uuid-1");
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
});
