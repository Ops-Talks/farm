import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { getToken } from "@willsoto/nestjs-prometheus";
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
  let mockPipelineExecutionsCounter: { inc: jest.Mock };

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
      server: { emit: jest.fn() },
    };

    mockPipelineExecutionsCounter = { inc: jest.fn() };

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
        {
          provide: getToken("pipeline_executions_total"),
          useValue: mockPipelineExecutionsCounter,
        },
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

    it("should filter by componentId when provided", async () => {
      pipelineRepo.findAndCount.mockResolvedValue([[mockPipeline], 1]);

      await service.findAll(0, 20, undefined, "comp-uuid-1");

      expect(pipelineRepo.findAndCount).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        order: { name: "ASC" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by both organizationId and componentId when both provided", async () => {
      pipelineRepo.findAndCount.mockResolvedValue([[mockPipeline], 1]);

      await service.findAll(0, 20, "org-uuid-1", "comp-uuid-1");

      expect(pipelineRepo.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1", componentId: "comp-uuid-1" },
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
      expect(mockPipelineExecutionsCounter.inc).toHaveBeenCalledWith({
        status: "failure",
        pipeline_id: "pipeline-uuid-1",
      });
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
      expect(mockPipelineExecutionsCounter.inc).toHaveBeenCalledWith({
        status: "cancelled",
        pipeline_id: "pipeline-uuid-1",
      });
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

  // ---------------------------------------------------------------------------
  // getRunStats
  // ---------------------------------------------------------------------------
  describe("getRunStats", () => {
    it("should return zero totals when there are no runs", async () => {
      runRepo.find.mockResolvedValue([]);

      const stats = await service.getRunStats("pipeline-uuid-1");

      expect(stats.total).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgDurationMs).toBeNull();
      expect(stats.lastRunAt).toBeNull();
    });

    it("should compute success rate and last run when runs exist", async () => {
      const runs = [
        {
          status: PipelineRunStatus.SUCCEEDED,
          durationMs: 3000,
          createdAt: new Date("2024-02-01"),
        },
        {
          status: PipelineRunStatus.SUCCEEDED,
          durationMs: 5000,
          createdAt: new Date("2024-01-01"),
        },
        {
          status: PipelineRunStatus.FAILED,
          durationMs: null,
          createdAt: new Date("2024-01-15"),
        },
      ];
      runRepo.find.mockResolvedValue(runs);

      const stats = await service.getRunStats("pipeline-uuid-1");

      expect(stats.total).toBe(3);
      expect(stats.byStatus[PipelineRunStatus.SUCCEEDED]).toBe(2);
      expect(stats.byStatus[PipelineRunStatus.FAILED]).toBe(1);
      // 2/3 * 100 = 66.7%
      expect(stats.successRate).toBeCloseTo(66.7, 0);
      // avg of 3000 and 5000 = 4000
      expect(stats.avgDurationMs).toBe(4000);
      // lastRunAt = most recent (runs[0] since ordered DESC)
      expect(stats.lastRunAt).toEqual(new Date("2024-02-01"));
    });

    it("should return null avgDurationMs when no succeeded run has a durationMs", async () => {
      const runs = [
        {
          status: PipelineRunStatus.SUCCEEDED,
          durationMs: null,
          createdAt: new Date("2024-01-01"),
        },
      ];
      runRepo.find.mockResolvedValue(runs);

      const stats = await service.getRunStats("pipeline-uuid-1");

      expect(stats.avgDurationMs).toBeNull();
      expect(stats.successRate).toBe(100);
    });

    it("should count all statuses in byStatus", async () => {
      const runs = [
        {
          status: PipelineRunStatus.QUEUED,
          durationMs: null,
          createdAt: new Date("2024-01-01"),
        },
        {
          status: PipelineRunStatus.RUNNING,
          durationMs: null,
          createdAt: new Date("2024-01-02"),
        },
        {
          status: PipelineRunStatus.CANCELLED,
          durationMs: null,
          createdAt: new Date("2024-01-03"),
        },
      ];
      runRepo.find.mockResolvedValue(runs);

      const stats = await service.getRunStats("pipeline-uuid-1");

      expect(stats.byStatus[PipelineRunStatus.QUEUED]).toBe(1);
      expect(stats.byStatus[PipelineRunStatus.RUNNING]).toBe(1);
      expect(stats.byStatus[PipelineRunStatus.CANCELLED]).toBe(1);
      expect(stats.byStatus[PipelineRunStatus.SUCCEEDED]).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // findRuns — status filter
  // ---------------------------------------------------------------------------
  describe("findRuns — with status filter", () => {
    it("should include status in the where clause when status is provided", async () => {
      runRepo.findAndCount.mockResolvedValue([[mockRun], 1]);

      await service.findRuns("pipeline-uuid-1", {
        status: PipelineRunStatus.SUCCEEDED,
      });

      expect(runRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          pipelineId: "pipeline-uuid-1",
          status: PipelineRunStatus.SUCCEEDED,
        },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should omit status from the where clause when status is not provided", async () => {
      runRepo.findAndCount.mockResolvedValue([[mockRun], 1]);

      await service.findRuns("pipeline-uuid-1", { skip: 0, take: 10 });

      expect(runRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pipelineId: "pipeline-uuid-1" },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // compareRuns
  // ---------------------------------------------------------------------------
  describe("compareRuns", () => {
    const baseRun: Partial<PipelineRun> = {
      ...mockRun,
      id: "run-a",
      status: PipelineRunStatus.SUCCEEDED,
      startedAt: new Date("2024-01-01T00:00:00Z"),
      finishedAt: new Date("2024-01-01T00:01:00Z"),
      durationMs: 60000,
      stageResults: [
        {
          stageId: "stage-1",
          status: "succeeded",
          startedAt: "2024-01-01T00:00:00Z",
          finishedAt: "2024-01-01T00:00:30Z",
          output: "ok",
        },
      ],
    };

    const compareRun: Partial<PipelineRun> = {
      ...mockRun,
      id: "run-b",
      status: PipelineRunStatus.FAILED,
      startedAt: new Date("2024-01-02T00:00:00Z"),
      finishedAt: new Date("2024-01-02T00:02:00Z"),
      durationMs: 120000,
      stageResults: [
        {
          stageId: "stage-1",
          status: "failed",
          startedAt: "2024-01-02T00:00:00Z",
          finishedAt: "2024-01-02T00:01:00Z",
          output: "err",
        },
        {
          stageId: "stage-2",
          status: "succeeded",
          startedAt: "2024-01-02T00:01:00Z",
          finishedAt: "2024-01-02T00:02:00Z",
          output: "ok",
        },
      ],
    };

    it("should return snapshots and stage diff for two runs", async () => {
      runRepo.findOne
        .mockResolvedValueOnce(baseRun)
        .mockResolvedValueOnce(compareRun);

      const result = await service.compareRuns(
        "pipeline-uuid-1",
        "run-a",
        "run-b",
      );

      expect(result.runA.id).toBe("run-a");
      expect(result.runB.id).toBe("run-b");
      // stage-1 is in both runs with different statuses → changed=true
      const stage1Diff = result.stageDiff.find((s) => s.stageId === "stage-1");
      expect(stage1Diff?.changed).toBe(true);
      expect(stage1Diff?.statusA).toBe("succeeded");
      expect(stage1Diff?.statusB).toBe("failed");
    });

    it("should include stages present in only one run", async () => {
      runRepo.findOne
        .mockResolvedValueOnce(baseRun)
        .mockResolvedValueOnce(compareRun);

      const result = await service.compareRuns(
        "pipeline-uuid-1",
        "run-a",
        "run-b",
      );

      // stage-2 is only in runB
      const stage2Diff = result.stageDiff.find((s) => s.stageId === "stage-2");
      expect(stage2Diff).toBeDefined();
      expect(stage2Diff?.statusA).toBeNull();
      expect(stage2Diff?.statusB).toBe("succeeded");
      expect(stage2Diff?.changed).toBe(true);
    });

    it("should compute durationDeltaMs when both stages have timestamps", async () => {
      runRepo.findOne
        .mockResolvedValueOnce(baseRun)
        .mockResolvedValueOnce(compareRun);

      const result = await service.compareRuns(
        "pipeline-uuid-1",
        "run-a",
        "run-b",
      );

      const stage1Diff = result.stageDiff.find((s) => s.stageId === "stage-1");
      // A: 00:00:30 - 00:00:00 = 30000ms; B: 00:01:00 - 00:00:00 = 60000ms
      expect(stage1Diff?.durationMsA).toBe(30000);
      expect(stage1Diff?.durationMsB).toBe(60000);
      expect(stage1Diff?.durationDeltaMs).toBe(30000);
    });

    it("should return null durationDeltaMs when a stage is missing timestamps", async () => {
      const runNoTimestamp: Partial<PipelineRun> = {
        ...mockRun,
        id: "run-c",
        status: PipelineRunStatus.FAILED,
        stageResults: [
          {
            stageId: "stage-1",
            status: "failed",
            startedAt: null,
            finishedAt: null,
            output: null,
          },
        ],
      };
      runRepo.findOne
        .mockResolvedValueOnce(baseRun)
        .mockResolvedValueOnce(runNoTimestamp);

      const result = await service.compareRuns(
        "pipeline-uuid-1",
        "run-a",
        "run-c",
      );

      const stage1Diff = result.stageDiff.find((s) => s.stageId === "stage-1");
      // B has no timestamps so durationMsB = null → durationDeltaMs = null
      expect(stage1Diff?.durationDeltaMs).toBeNull();
    });

    it("should return empty stageDiff when both runs have no stageResults", async () => {
      runRepo.findOne
        .mockResolvedValueOnce({ ...mockRun, id: "run-x", stageResults: null })
        .mockResolvedValueOnce({ ...mockRun, id: "run-y", stageResults: null });

      const result = await service.compareRuns(
        "pipeline-uuid-1",
        "run-x",
        "run-y",
      );

      expect(result.stageDiff).toHaveLength(0);
    });

    it("should throw NotFoundException when runA does not exist", async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.compareRuns("pipeline-uuid-1", "nonexistent", "run-b"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // approveRun — additional branches
  // ---------------------------------------------------------------------------
  describe("approveRun — when approval stage is not in pipeline stages", () => {
    it("should still approve and resume from order 0 when stage is not found in pipeline", async () => {
      const waitingRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.WAITING_APPROVAL,
        startedAt: new Date("2024-01-01T00:00:00Z"),
        stageResults: [
          {
            stageId: "stage-unknown",
            status: "waiting_approval",
            startedAt: "2024-01-01T00:00:00Z",
            finishedAt: null,
            output: null,
          },
        ],
      };
      const savedRun = {
        ...waitingRun,
        status: PipelineRunStatus.RUNNING,
      };
      runRepo.findOne.mockResolvedValue(waitingRun);
      // Pipeline has no stage matching "stage-unknown"
      pipelineRepo.findOne.mockResolvedValue({
        ...mockPipeline,
        stages: [
          {
            id: "stage-other",
            name: "Other",
            type: "script",
            config: {},
            order: 0,
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
      expect(executionQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.PIPELINE_EXECUTION,
        expect.objectContaining({ resumeFromStageOrder: 0 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // rejectRun — run without startedAt
  // ---------------------------------------------------------------------------
  describe("rejectRun — when run has no startedAt", () => {
    it("should set durationMs to null when startedAt is null", async () => {
      const waitingRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.WAITING_APPROVAL,
        startedAt: null,
        stageResults: null,
      };
      runRepo.findOne.mockResolvedValue(waitingRun);
      runRepo.save.mockImplementation((r: Partial<PipelineRun>) =>
        Promise.resolve(r as PipelineRun),
      );

      await service.rejectRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1");

      const saveArg = (
        runRepo.save.mock.calls as [Partial<PipelineRun>][][]
      )[0][0];
      expect(saveArg.durationMs).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("PipelinesService — additional branches", () => {
  let service: PipelinesService;
  let pipelineRepo: Record<string, jest.Mock>;
  let runRepo: Record<string, jest.Mock>;

  const mockPipeline: Partial<Pipeline> = {
    id: "pipeline-uuid-1",
    name: "deploy-to-production",
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        { provide: getRepositoryToken(Pipeline), useValue: pipelineRepo },
        { provide: getRepositoryToken(PipelineRun), useValue: runRepo },
        // No executionQueue, no eventsGateway, no counter — all optional
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // create — with stages provided (exercises dto.stages ?? [])
  // -------------------------------------------------------------------------

  describe("create — stages provided in dto", () => {
    it("should use provided stages array instead of empty default", async () => {
      pipelineRepo.findOne.mockResolvedValue(null);
      pipelineRepo.create.mockImplementation(
        (d: Partial<Pipeline>) => d as Pipeline,
      );
      pipelineRepo.save.mockImplementation((p: Pipeline) => Promise.resolve(p));

      await service.create(
        {
          name: "pipeline-with-stages",
          stages: [
            { id: "s1", name: "Build", type: "build", config: {}, order: 0 },
          ],
        },
        "user-1",
      );

      expect(pipelineRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({ id: "s1" }),
          ]) as unknown,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // triggerRun — without executionQueue (optional chaining ?? path)
  // -------------------------------------------------------------------------

  describe("triggerRun — without executionQueue", () => {
    it("should create and save a run even when no executionQueue is provided", async () => {
      pipelineRepo.findOne.mockResolvedValue(mockPipeline);
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      const result = await service.triggerRun("pipeline-uuid-1", "user-uuid-1");

      expect(result).toEqual(mockRun);
      expect(runRepo.save).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // approveRun — no approvalStageResult (run.stageResults is empty / null path)
  // -------------------------------------------------------------------------

  describe("approveRun — no waiting_approval stage result", () => {
    it("should approve and resume from order 0 when stageResults is empty", async () => {
      const waitingRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.WAITING_APPROVAL,
        stageResults: [],
      };
      const savedRun = { ...waitingRun, status: PipelineRunStatus.RUNNING };

      runRepo.findOne.mockResolvedValue(waitingRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.approveRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.RUNNING);
    });

    it("should approve when stageResults is null", async () => {
      const waitingRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.WAITING_APPROVAL,
        stageResults: null,
      };
      const savedRun = { ...waitingRun, status: PipelineRunStatus.RUNNING };

      runRepo.findOne.mockResolvedValue(waitingRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.approveRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.RUNNING);
    });

    it("should set stageResults to the mapped array when stageResults was null but has waiting_approval", async () => {
      const waitingRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.WAITING_APPROVAL,
        stageResults: [
          {
            stageId: "stage-approval",
            status: "waiting_approval",
            startedAt: "2024-01-01T00:00:00Z",
            finishedAt: null,
            output: null,
          },
        ],
      };
      const savedRun = { ...waitingRun, status: PipelineRunStatus.RUNNING };

      // Pipeline found but stage not in pipeline.stages (approvalStage undefined)
      pipelineRepo.findOne.mockResolvedValue({
        ...mockPipeline,
        stages: [],
      });
      runRepo.findOne.mockResolvedValue(waitingRun);
      runRepo.save.mockResolvedValue(savedRun);

      const result = await service.approveRun(
        "pipeline-uuid-1",
        "run-uuid-1",
        "user-uuid-1",
      );

      expect(result.status).toBe(PipelineRunStatus.RUNNING);
    });
  });

  // -------------------------------------------------------------------------
  // approveRun — throws BadRequestException when not in WAITING_APPROVAL
  // -------------------------------------------------------------------------

  describe("approveRun — wrong status throws BadRequestException", () => {
    it("should throw BadRequestException when run is RUNNING", async () => {
      runRepo.findOne.mockResolvedValue({
        ...mockRun,
        status: PipelineRunStatus.RUNNING,
      });

      await expect(
        service.approveRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // rejectRun — throws BadRequestException when not in WAITING_APPROVAL
  // -------------------------------------------------------------------------

  describe("rejectRun — wrong status", () => {
    it("should throw BadRequestException when run is QUEUED", async () => {
      runRepo.findOne.mockResolvedValue({
        ...mockRun,
        status: PipelineRunStatus.QUEUED,
      });

      await expect(
        service.rejectRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // cancelRun — without executionQueue and startedAt null
  // -------------------------------------------------------------------------

  describe("cancelRun — without executionQueue and no startedAt", () => {
    it("should set durationMs to null when startedAt is null", async () => {
      const queuedRun: Partial<PipelineRun> = {
        ...mockRun,
        status: PipelineRunStatus.QUEUED,
        startedAt: null,
      };
      runRepo.findOne.mockResolvedValue(queuedRun);
      runRepo.save.mockImplementation((r: Partial<PipelineRun>) =>
        Promise.resolve(r as PipelineRun),
      );

      await service.cancelRun("pipeline-uuid-1", "run-uuid-1", "user-uuid-1");

      const saveArg = (
        runRepo.save.mock.calls as [Partial<PipelineRun>][][]
      )[0][0];
      expect(saveArg.durationMs).toBeNull();
      expect(saveArg.status).toBe(PipelineRunStatus.CANCELLED);
    });
  });

  // -------------------------------------------------------------------------
  // update — dto.name same as pipeline.name (no conflict check)
  // -------------------------------------------------------------------------

  describe("update — dto.name equals current name", () => {
    it("should skip the conflict check when the new name is the same as the current name", async () => {
      const updatedPipeline = {
        ...mockPipeline,
        description: "Same name, new desc",
      };
      pipelineRepo.findOne.mockResolvedValueOnce(mockPipeline);
      pipelineRepo.merge.mockReturnValue(updatedPipeline);
      pipelineRepo.save.mockResolvedValue(updatedPipeline);

      const result = await service.update("pipeline-uuid-1", {
        name: "deploy-to-production", // same as mockPipeline.name
        description: "Same name, new desc",
      });

      // Only one findOne call (for the pipeline itself, not the conflict check)
      expect(pipelineRepo.findOne).toHaveBeenCalledTimes(1);
      expect(result.description).toBe("Same name, new desc");
    });
  });

  // -------------------------------------------------------------------------
  // update — dto.name different from current but no conflict found
  // -------------------------------------------------------------------------

  describe("update — dto.name different, no conflict", () => {
    it("should update successfully when new name does not conflict", async () => {
      const updatedPipeline = { ...mockPipeline, name: "new-unique-name" };
      pipelineRepo.findOne
        .mockResolvedValueOnce(mockPipeline) // fetch pipeline to update
        .mockResolvedValueOnce(null); // conflict check: none found
      pipelineRepo.merge.mockReturnValue(updatedPipeline);
      pipelineRepo.save.mockResolvedValue(updatedPipeline);

      const result = await service.update("pipeline-uuid-1", {
        name: "new-unique-name",
      });

      expect(pipelineRepo.findOne).toHaveBeenCalledTimes(2);
      expect(result.name).toBe("new-unique-name");
    });
  });

  // -------------------------------------------------------------------------
  // getRunStats — total = 0 (successRate = 0, lastRunAt = null)
  // -------------------------------------------------------------------------

  describe("getRunStats — zero runs", () => {
    it("should return successRate=0 and lastRunAt=null when there are no runs", async () => {
      runRepo.find.mockResolvedValue([]);

      const stats = await service.getRunStats("pipeline-uuid-1");

      expect(stats.total).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.lastRunAt).toBeNull();
      expect(stats.avgDurationMs).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // compareRuns — stage with invalid timestamps (isNaN path)
  // -------------------------------------------------------------------------

  describe("compareRuns — stage with invalid timestamps", () => {
    it("should return null durationMs when timestamps are invalid strings", async () => {
      const runWithInvalidTs: Partial<PipelineRun> = {
        ...mockRun,
        id: "run-invalid",
        status: PipelineRunStatus.FAILED,
        stageResults: [
          {
            stageId: "stage-bad",
            status: "failed",
            startedAt: "not-a-date",
            finishedAt: "also-not-a-date",
            output: null,
          },
        ],
      };

      const baseRun: Partial<PipelineRun> = {
        ...mockRun,
        id: "run-a",
        status: PipelineRunStatus.SUCCEEDED,
        stageResults: [
          {
            stageId: "stage-bad",
            status: "succeeded",
            startedAt: "2024-01-01T00:00:00Z",
            finishedAt: "2024-01-01T00:01:00Z",
            output: null,
          },
        ],
      };

      runRepo.findOne
        .mockResolvedValueOnce(baseRun)
        .mockResolvedValueOnce(runWithInvalidTs);

      const result = await service.compareRuns(
        "pipeline-uuid-1",
        "run-a",
        "run-invalid",
      );

      const stageDiff = result.stageDiff.find((s) => s.stageId === "stage-bad");
      // runWithInvalidTs has isNaN timestamps => durationMsB = null
      expect(stageDiff?.durationMsB).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findRun — NotFoundException
  // -------------------------------------------------------------------------

  describe("findRun — NotFoundException", () => {
    it("should throw NotFoundException when run does not belong to pipeline", async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findRun("pipeline-uuid-1", "nonexistent-run"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // findByComponent
  // -------------------------------------------------------------------------

  describe("findByComponent", () => {
    it("should return pipelines filtered by componentId", async () => {
      pipelineRepo.findAndCount.mockResolvedValue([[mockPipeline], 1]);

      const [data, total] = await service.findByComponent("comp-uuid-1");

      expect(data).toHaveLength(1);
      expect(total).toBe(1);
      expect(pipelineRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { componentId: "comp-uuid-1" },
        }),
      );
    });

    it("should pass pagination params to findAndCount", async () => {
      pipelineRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByComponent("comp-uuid-1", undefined, 10, 5);

      expect(pipelineRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateStageFromExternalEvent
  // -------------------------------------------------------------------------

  describe("updateStageFromExternalEvent", () => {
    const baseRun: Partial<PipelineRun> = {
      id: "run-uuid-1",
      pipelineId: "pipeline-uuid-1",
      status: PipelineRunStatus.RUNNING,
      triggeredBy: "user-uuid-1",
      stageResults: [
        {
          stageId: "stage-1",
          status: "running",
          startedAt: "2024-01-01T00:00:00Z",
          finishedAt: null,
          output: null,
          externalRunId: "42",
        },
      ],
      startedAt: new Date("2024-01-01T00:00:00Z"),
      finishedAt: null,
      durationMs: null,
      logs: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("updates the matching stage result status to succeeded", async () => {
      runRepo.find.mockResolvedValue([{ ...baseRun }]);
      runRepo.save.mockImplementation((r: PipelineRun) => Promise.resolve(r));

      await service.updateStageFromExternalEvent(
        "42",
        "completed",
        "success",
        null,
      );

      const calls = runRepo.save.mock.calls as unknown as Array<[PipelineRun]>;
      const savedRun: PipelineRun | undefined = calls[0]?.[0];
      const firstStage = (savedRun?.stageResults ?? [])[0];
      expect(firstStage?.status).toBe("succeeded");
    });

    it("updates the matching stage result status to failed", async () => {
      runRepo.find.mockResolvedValue([{ ...baseRun }]);
      runRepo.save.mockImplementation((r: PipelineRun) => Promise.resolve(r));

      await service.updateStageFromExternalEvent(
        "42",
        "completed",
        "failure",
        null,
      );

      const calls = runRepo.save.mock.calls as unknown as Array<[PipelineRun]>;
      const savedRun: PipelineRun | undefined = calls[0]?.[0];
      const firstStage = (savedRun?.stageResults ?? [])[0];
      expect(firstStage?.status).toBe("failed");
    });

    it("returns early without saving when no running run matches the externalRunId", async () => {
      // Return a run whose stageResults do not contain externalRunId "999".
      runRepo.find.mockResolvedValue([{ ...baseRun }]);

      await service.updateStageFromExternalEvent(
        "999",
        "completed",
        "success",
        null,
      );

      expect(runRepo.save).not.toHaveBeenCalled();
    });

    it("returns early without saving when no running runs exist", async () => {
      runRepo.find.mockResolvedValue([]);

      await service.updateStageFromExternalEvent(
        "42",
        "completed",
        "success",
        null,
      );

      expect(runRepo.save).not.toHaveBeenCalled();
    });

    it("maps an in_progress CI status to running", async () => {
      runRepo.find.mockResolvedValue([{ ...baseRun }]);
      runRepo.save.mockImplementation((r: PipelineRun) => Promise.resolve(r));

      await service.updateStageFromExternalEvent(
        "42",
        "in_progress",
        null,
        null,
      );

      const calls = runRepo.save.mock.calls as unknown as Array<[PipelineRun]>;
      const savedRun: PipelineRun | undefined = calls[0]?.[0];
      const firstStage = (savedRun?.stageResults ?? [])[0];
      expect(firstStage?.status).toBe("running");
    });
  });
});
