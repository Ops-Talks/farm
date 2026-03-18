import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PipelinesService } from "./pipelines.service";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun, PipelineRunStatus } from "./entities/pipeline-run.entity";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";

describe("PipelinesService", () => {
  let service: PipelinesService;
  let pipelineRepo: Record<string, jest.Mock>;
  let runRepo: Record<string, jest.Mock>;
  let executionQueue: Record<string, jest.Mock>;
  let eventsGateway: Record<string, jest.Mock>;

  const mockPipeline: Partial<Pipeline> = {
    id: "pipeline-uuid-1",
    name: "deploy-to-production",
    description: "Deploy main service to production",
    stages: [],
    organizationId: null as unknown as string,
    createdBy: "user-uuid-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRun: Partial<PipelineRun> = {
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

  beforeEach(async () => {
    pipelineRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
    };

    runRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    executionQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-1" }),
      getJob: jest.fn().mockResolvedValue(null),
    };

    eventsGateway = {
      emitPipelineRunUpdated: jest.fn(),
      emitPipelineLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        { provide: getRepositoryToken(Pipeline), useValue: pipelineRepo },
        { provide: getRepositoryToken(PipelineRun), useValue: runRepo },
        {
          provide: getQueueToken(QUEUE_NAMES.PIPELINE_EXECUTION),
          useValue: executionQueue,
        },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a pipeline", async () => {
      pipelineRepo.findOne.mockResolvedValue(null);
      pipelineRepo.create.mockReturnValue(mockPipeline);
      pipelineRepo.save.mockResolvedValue(mockPipeline);

      const result = await service.create(
        { name: "deploy-to-production" },
        "user-uuid-1",
      );

      expect(result).toEqual(mockPipeline);
      expect(pipelineRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "deploy-to-production",
          createdBy: "user-uuid-1",
        }),
      );
    });

    it("should throw ConflictException if pipeline name exists", async () => {
      pipelineRepo.findOne.mockResolvedValue(mockPipeline);

      await expect(
        service.create({ name: "deploy-to-production" }, "user-uuid-1"),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findAll", () => {
    it("should return all pipelines", async () => {
      pipelineRepo.findAndCount.mockResolvedValue([[mockPipeline], 1]);

      const [data, total] = await service.findAll();

      expect(data).toHaveLength(1);
      expect(total).toBe(1);
      expect(pipelineRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { name: "ASC" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by organizationId", async () => {
      pipelineRepo.findAndCount.mockResolvedValue([[mockPipeline], 1]);

      await service.findAll(0, 20, "org-uuid-1");

      expect(pipelineRepo.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1" },
        order: { name: "ASC" },
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findOne", () => {
    it("should return a pipeline by ID", async () => {
      pipelineRepo.findOne.mockResolvedValue(mockPipeline);

      const result = await service.findOne("pipeline-uuid-1");

      expect(result).toEqual(mockPipeline);
    });

    it("should throw NotFoundException if pipeline not found", async () => {
      pipelineRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a pipeline", async () => {
      const updated = { ...mockPipeline, description: "Updated description" };
      pipelineRepo.findOne.mockResolvedValue(mockPipeline);
      pipelineRepo.merge.mockReturnValue(updated);
      pipelineRepo.save.mockResolvedValue(updated);

      const result = await service.update("pipeline-uuid-1", {
        description: "Updated description",
      });

      expect(result.description).toBe("Updated description");
    });

    it("should throw ConflictException on duplicate name", async () => {
      pipelineRepo.findOne
        .mockResolvedValueOnce(mockPipeline)
        .mockResolvedValueOnce({
          ...mockPipeline,
          id: "other-uuid",
          name: "other-pipeline",
        });

      await expect(
        service.update("pipeline-uuid-1", { name: "other-pipeline" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException if pipeline not found", async () => {
      pipelineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { description: "test" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a pipeline", async () => {
      pipelineRepo.findOne.mockResolvedValue(mockPipeline);
      pipelineRepo.remove.mockResolvedValue(mockPipeline);

      await service.remove("pipeline-uuid-1");

      expect(pipelineRepo.remove).toHaveBeenCalledWith(mockPipeline);
    });

    it("should throw NotFoundException if pipeline not found", async () => {
      pipelineRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("triggerRun", () => {
    it("should create a run and enqueue a job", async () => {
      pipelineRepo.findOne.mockResolvedValue(mockPipeline);
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      const result = await service.triggerRun("pipeline-uuid-1", "user-uuid-1");

      expect(result).toEqual(mockRun);
      expect(runRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineId: "pipeline-uuid-1",
          triggeredBy: "user-uuid-1",
          status: PipelineRunStatus.QUEUED,
        }),
      );
      expect(executionQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.PIPELINE_EXECUTION,
        expect.objectContaining({
          pipelineId: "pipeline-uuid-1",
          runId: "run-uuid-1",
          triggeredBy: "user-uuid-1",
        }),
      );
    });

    it("should throw NotFoundException if pipeline not found", async () => {
      pipelineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.triggerRun("nonexistent", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findRuns", () => {
    it("should return runs for a pipeline ordered by createdAt DESC", async () => {
      runRepo.findAndCount.mockResolvedValue([[mockRun], 1]);

      const [runs, total] = await service.findRuns("pipeline-uuid-1", {});

      expect(runs).toHaveLength(1);
      expect(total).toBe(1);
      expect(runRepo.findAndCount).toHaveBeenCalledWith({
        where: { pipelineId: "pipeline-uuid-1" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findRun", () => {
    it("should return a specific run", async () => {
      runRepo.findOne.mockResolvedValue(mockRun);

      const result = await service.findRun("pipeline-uuid-1", "run-uuid-1");

      expect(result).toEqual(mockRun);
      expect(runRepo.findOne).toHaveBeenCalledWith({
        where: { id: "run-uuid-1", pipelineId: "pipeline-uuid-1" },
      });
    });

    it("should throw NotFoundException if run not found", async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findRun("pipeline-uuid-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("approveRun", () => {
    const waitingRun: Partial<PipelineRun> = {
      ...mockRun,
      status: PipelineRunStatus.WAITING_APPROVAL,
      startedAt: new Date("2024-01-01T00:00:00Z"),
      stageResults: [
        {
          stageId: "stage-approval-1",
          status: "waiting_approval",
          startedAt: "2024-01-01T00:00:00Z",
          finishedAt: null,
          output: null,
        },
      ],
    };

    it("should approve a waiting run and enqueue a resume job", async () => {
      const savedRun = {
        ...waitingRun,
        status: PipelineRunStatus.RUNNING,
      };
      runRepo.findOne.mockResolvedValue(waitingRun);
      pipelineRepo.findOne.mockResolvedValue({
        ...mockPipeline,
        stages: [
          {
            id: "stage-approval-1",
            name: "Approval Gate",
            type: "approval",
            config: {},
            order: 1,
          },
        ],
      });
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.approveRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.RUNNING);
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PipelineRunStatus.RUNNING }),
      );
      expect(executionQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.PIPELINE_EXECUTION,
        expect.objectContaining({
          pipelineId: "pipeline-uuid-1",
          runId: "run-uuid-1",
          resumeFromStageOrder: 2,
        }),
      );
      expect(eventsGateway.emitPipelineRunUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: savedRun.id }),
      );
    });

    it("should throw BadRequestException when run is not waiting for approval", async () => {
      runRepo.findOne.mockResolvedValue({
        ...mockRun,
        status: PipelineRunStatus.RUNNING,
      });

      await expect(
        service.approveRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when run does not belong to pipeline", async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveRun("pipeline-uuid-1", "nonexistent", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("rejectRun", () => {
    const waitingRun: Partial<PipelineRun> = {
      ...mockRun,
      status: PipelineRunStatus.WAITING_APPROVAL,
      startedAt: new Date("2024-01-01T00:00:00Z"),
      stageResults: null,
    };

    it("should reject a waiting run and mark it as FAILED", async () => {
      const savedRun = {
        ...waitingRun,
        status: PipelineRunStatus.FAILED,
        finishedAt: new Date(),
        durationMs: 5000,
      };
      runRepo.findOne.mockResolvedValue(waitingRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.rejectRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.FAILED);
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PipelineRunStatus.FAILED }),
      );
      expect(eventsGateway.emitPipelineRunUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: savedRun.id }),
      );
    });

    it("should throw BadRequestException when run is not waiting for approval", async () => {
      runRepo.findOne.mockResolvedValue({
        ...mockRun,
        status: PipelineRunStatus.SUCCEEDED,
      });

      await expect(
        service.rejectRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when run does not belong to pipeline", async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rejectRun("pipeline-uuid-1", "nonexistent", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("cancelRun", () => {
    it("should cancel a QUEUED run", async () => {
      const queuedRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.QUEUED,
        startedAt: null,
      };
      const savedRun = {
        ...queuedRun,
        status: PipelineRunStatus.CANCELLED,
        finishedAt: new Date(),
        durationMs: null,
      };
      runRepo.findOne.mockResolvedValue(queuedRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.cancelRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.CANCELLED);
      expect(runRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PipelineRunStatus.CANCELLED }),
      );
      expect(eventsGateway.emitPipelineRunUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: savedRun.id }),
      );
    });

    it("should cancel a RUNNING run and calculate durationMs", async () => {
      const startedAt = new Date("2024-01-01T00:00:00Z");
      const runningRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.RUNNING,
        startedAt,
      };
      const savedRun = {
        ...runningRun,
        status: PipelineRunStatus.CANCELLED,
        finishedAt: new Date(),
        durationMs: 10000,
      };
      runRepo.findOne.mockResolvedValue(runningRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.cancelRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.CANCELLED);
      // durationMs is computed from startedAt so it must be a positive number.
      const saveArg = (
        runRepo.save.mock.calls as [Partial<PipelineRun>][][]
      )[0][0];
      expect(saveArg.durationMs).toBeGreaterThan(0);
    });

    it("should cancel a WAITING_APPROVAL run", async () => {
      const waitingRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.WAITING_APPROVAL,
        startedAt: new Date("2024-01-01T00:00:00Z"),
      };
      const savedRun = {
        ...waitingRun,
        status: PipelineRunStatus.CANCELLED,
        finishedAt: new Date(),
        durationMs: 5000,
      };
      runRepo.findOne.mockResolvedValue(waitingRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.cancelRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.CANCELLED);
    });

    it("should throw BadRequestException when run is already completed", async () => {
      runRepo.findOne.mockResolvedValue({
        ...mockRun,
        status: PipelineRunStatus.SUCCEEDED,
      });

      await expect(
        service.cancelRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when run has already failed", async () => {
      runRepo.findOne.mockResolvedValue({
        ...mockRun,
        status: PipelineRunStatus.FAILED,
      });

      await expect(
        service.cancelRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when run does not belong to pipeline", async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelRun("pipeline-uuid-1", "nonexistent", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
