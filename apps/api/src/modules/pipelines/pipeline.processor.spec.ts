import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Job } from "bullmq";
import {
  PipelineProcessor,
  PipelineExecutionJobData,
} from "./pipeline.processor";
import { PipelineRun, PipelineRunStatus } from "./entities/pipeline-run.entity";
import { Pipeline, PipelineStage } from "./entities/pipeline.entity";
import { EventsGateway } from "../../common/events/events.gateway";

/**
 * Helper that builds a minimal PipelineRun object for test fixtures.
 */
function buildRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: "run-uuid-1",
    pipelineId: "pipeline-uuid-1",
    status: PipelineRunStatus.QUEUED,
    triggeredBy: "user-uuid-1",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    logs: null,
    stageResults: null,
    pipeline: {} as Pipeline,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

/**
 * Helper that builds a minimal Pipeline object for test fixtures.
 */
function buildPipeline(stages: PipelineStage[] = []): Partial<Pipeline> {
  return {
    id: "pipeline-uuid-1",
    name: "test-pipeline",
    stages,
    organizationId: null as unknown as string,
    createdBy: "user-uuid-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };
}

/**
 * Builds a mock BullMQ Job with the given data payload.
 */
function buildJob(
  data: PipelineExecutionJobData,
): Job<PipelineExecutionJobData> {
  return { data } as Job<PipelineExecutionJobData>;
}

describe("PipelineProcessor", () => {
  let processor: PipelineProcessor;
  let mockRunRepo: Record<string, jest.Mock>;
  let mockPipelineRepo: Record<string, jest.Mock>;
  let mockEventsGateway: { server: { emit: jest.Mock } };

  const scriptStage: PipelineStage = {
    id: "stage-script-1",
    name: "Build",
    type: "script",
    config: {},
    order: 1,
  };

  const approvalStage: PipelineStage = {
    id: "stage-approval-1",
    name: "Manual Gate",
    type: "approval",
    config: {},
    order: 1,
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    mockRunRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockPipelineRepo = {
      findOne: jest.fn(),
    };

    mockEventsGateway = {
      server: { emit: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineProcessor,
        {
          provide: getRepositoryToken(PipelineRun),
          useValue: mockRunRepo,
        },
        {
          provide: getRepositoryToken(Pipeline),
          useValue: mockPipelineRepo,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    processor = module.get<PipelineProcessor>(PipelineProcessor);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Scenario 1 — run not found
  // ---------------------------------------------------------------------------

  describe("when the run record cannot be found", () => {
    it("should log an error and return early without touching the pipeline", async () => {
      mockRunRepo.findOne.mockResolvedValue(null);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-missing",
        triggeredBy: "user-uuid-1",
      });

      await processor.process(job);

      expect(mockRunRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockPipelineRepo.findOne).not.toHaveBeenCalled();
      expect(mockRunRepo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2 — run already cancelled
  // ---------------------------------------------------------------------------

  describe("when the run has already been cancelled", () => {
    it("should log a warning and return early without modifying the run", async () => {
      const cancelledRun = buildRun({ status: PipelineRunStatus.CANCELLED });
      mockRunRepo.findOne.mockResolvedValue(cancelledRun);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      await processor.process(job);

      expect(mockRunRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockPipelineRepo.findOne).not.toHaveBeenCalled();
      expect(mockRunRepo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3 — pipeline definition not found
  // ---------------------------------------------------------------------------

  describe("when the pipeline definition cannot be found", () => {
    it("should mark the run as FAILED and emit an update event", async () => {
      const run = buildRun({ status: PipelineRunStatus.QUEUED });
      mockRunRepo.findOne.mockResolvedValue(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(null);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      await processor.process(job);

      // save is called twice: once to set RUNNING, once inside failRun
      expect(mockRunRepo.save).toHaveBeenCalledTimes(2);
      const savedRun = (mockRunRepo.save.mock.calls as [PipelineRun][][])[1][0];
      expect(savedRun.status).toBe(PipelineRunStatus.FAILED);
      expect(mockEventsGateway.server.emit).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4 — successful run with a single script stage
  // ---------------------------------------------------------------------------

  describe("when the pipeline has a single script stage", () => {
    it("should execute the stage and finish the run with SUCCEEDED status", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([scriptStage]);

      // Initial findOne returns the run; per-stage cancel-check also returns it.
      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      const lastSave = mockRunRepo.save.mock.calls.at(-1) as [PipelineRun];
      expect(lastSave[0].status).toBe(PipelineRunStatus.SUCCEEDED);
      expect(lastSave[0].finishedAt).toBeInstanceOf(Date);
      expect(mockEventsGateway.server.emit).toHaveBeenCalled();
    });

    it("should populate stageResults after the stage completes", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([scriptStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      const lastSave = mockRunRepo.save.mock.calls.at(-1) as [PipelineRun];
      expect(lastSave[0].stageResults).toHaveLength(1);
      expect(lastSave[0].stageResults?.[0].status).toBe("succeeded");
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5 — approval stage pauses the run
  // ---------------------------------------------------------------------------

  describe("when the pipeline contains an approval stage", () => {
    it("should set the run status to WAITING_APPROVAL and return early", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([approvalStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      // The save inside the approval branch sets WAITING_APPROVAL.
      const approvalSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((call) => call[0].status === PipelineRunStatus.WAITING_APPROVAL);
      expect(approvalSave).toBeDefined();
      expect(mockEventsGateway.server.emit).toHaveBeenCalled();
    });

    it("should record a waiting_approval stage result", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([approvalStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      const lastSave = mockRunRepo.save.mock.calls.at(-1) as [PipelineRun];
      expect(lastSave[0].stageResults?.[0].status).toBe("waiting_approval");
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 6 — resume from a specific stage order
  // ---------------------------------------------------------------------------

  describe("when resumeFromStageOrder is provided", () => {
    it("should skip stages with a lower order and skip the initial run-setup save", async () => {
      const run = buildRun({
        status: PipelineRunStatus.RUNNING,
        startedAt: new Date("2024-01-01T00:00:00Z"),
        stageResults: [
          {
            stageId: "stage-script-0",
            status: "succeeded",
            startedAt: "2024-01-01T00:00:00Z",
            finishedAt: "2024-01-01T00:00:01Z",
            output: "ok",
          },
        ],
      });

      const stageOrder1: PipelineStage = {
        id: "stage-script-0",
        name: "Lint",
        type: "script",
        config: {},
        order: 1,
      };
      const stageOrder2: PipelineStage = {
        id: "stage-script-2",
        name: "Test",
        type: "script",
        config: {},
        order: 2,
      };
      const pipeline = buildPipeline([stageOrder1, stageOrder2]);

      // Initial findOne + one cancel check for stage order 2 only.
      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
        resumeFromStageOrder: 2,
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      // Only one save should occur: the final SUCCEEDED save (no initial RUNNING save).
      expect(mockRunRepo.save).toHaveBeenCalledTimes(1);
      const savedRun = (mockRunRepo.save.mock.calls as [PipelineRun][][])[0][0];
      expect(savedRun.status).toBe(PipelineRunStatus.SUCCEEDED);
    });

    it("should only process stages whose order is >= resumeFromStageOrder", async () => {
      const run = buildRun({
        status: PipelineRunStatus.RUNNING,
        startedAt: new Date("2024-01-01T00:00:00Z"),
        stageResults: [],
      });

      const stageA: PipelineStage = {
        id: "stage-a",
        name: "Compile",
        type: "script",
        config: {},
        order: 1,
      };
      const stageB: PipelineStage = {
        id: "stage-b",
        name: "Deploy",
        type: "script",
        config: {},
        order: 3,
      };
      const pipeline = buildPipeline([stageA, stageB]);

      // Initial findOne + one cancel check for stageB only (stageA is skipped).
      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
        resumeFromStageOrder: 3,
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      // Two log emits: "Starting stage" + "Stage succeeded" for stageB.
      // stageA emits nothing because it is filtered out.
      const logEmits = (
        mockEventsGateway.server.emit.mock.calls as [
          string,
          { stage: string },
        ][]
      ).filter((call) => call[0] === "pipeline.log");
      expect(logEmits.every((call) => call[1].stage !== "Compile")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 7 — cancellation detected mid-run
  // ---------------------------------------------------------------------------

  describe("when the run is cancelled while stages are executing", () => {
    it("should stop before the second stage and not save a SUCCEEDED status", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const cancelledRun = buildRun({
        status: PipelineRunStatus.CANCELLED,
        startedAt: new Date("2024-01-01T00:00:00Z"),
      });

      const stage1: PipelineStage = {
        id: "stage-1",
        name: "Build",
        type: "script",
        config: {},
        order: 1,
      };
      const stage2: PipelineStage = {
        id: "stage-2",
        name: "Deploy",
        type: "script",
        config: {},
        order: 2,
      };
      const pipeline = buildPipeline([stage1, stage2]);

      mockRunRepo.findOne
        .mockResolvedValueOnce(run) // initial findOne
        .mockResolvedValueOnce(run) // cancel check for stage 1 (not cancelled)
        .mockResolvedValueOnce(cancelledRun); // cancel check for stage 2 (cancelled)

      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      const processPromise = processor.process(job);
      await jest.runAllTimersAsync();
      await processPromise;

      // Only the initial RUNNING save should have occurred; no SUCCEEDED save.
      const succeededSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((call) => call[0].status === PipelineRunStatus.SUCCEEDED);
      expect(succeededSave).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 8 — unhandled error during execution
  // ---------------------------------------------------------------------------

  describe("when an unhandled error is thrown during stage execution", () => {
    it("should catch the error and mark the run as FAILED", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([scriptStage]);

      mockRunRepo.findOne
        .mockResolvedValueOnce(run) // initial findOne
        .mockRejectedValueOnce(new Error("DB connection error")); // cancel-check throws

      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      await processor.process(job);

      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((call) => call[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
      expect(mockEventsGateway.server.emit).toHaveBeenCalled();
    });

    it("should include the error message in the failure and emit an update event", async () => {
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([scriptStage]);

      mockRunRepo.findOne
        .mockResolvedValueOnce(run)
        .mockRejectedValueOnce(new Error("Unexpected failure"));

      // First save (RUNNING) succeeds; second save (failRun FAILED) also succeeds.
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const job = buildJob({
        pipelineId: "pipeline-uuid-1",
        runId: "run-uuid-1",
        triggeredBy: "user-uuid-1",
      });

      await processor.process(job);

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "pipeline.run.updated",
        expect.objectContaining({ status: PipelineRunStatus.FAILED }),
      );
    });
  });
});
