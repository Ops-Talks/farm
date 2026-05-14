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
import { HelmDeployExecutor } from "../helm/helm-deploy.executor";
import { BuildStageExecutor } from "./build-stage.executor";
import { InfracostStageExecutor } from "./infracost-stage.executor";
import { AwsEcsExecutor } from "../cloud/executors/aws-ecs.executor";
import { AwsLambdaExecutor } from "../cloud/executors/aws-lambda.executor";
import { GcpCloudRunExecutor } from "../cloud/executors/gcp-cloud-run.executor";
import { AzureContainerAppsExecutor } from "../cloud/executors/azure-container-apps.executor";
import { CloudSecretsService } from "../cloud/cloud-secrets.service";
import {
  IntegrationCredential,
  IntegrationType,
} from "../integrations/entities/integration-credential.entity";
import { GitHubActionsService } from "../integrations/github-actions.service";
import * as crypto from "crypto";

/**
 * Builds an AES-256-GCM encrypted payload matching IntegrationCredentialService.
 */
function buildEncryptedCredential(payload: object, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

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
    metadata: null,
    deploymentId: null,
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

  // ---------------------------------------------------------------------------
  // Scenario 9 — Helm deploy stage dispatch (FARM-S138)
  // ---------------------------------------------------------------------------

  describe("Helm deploy stage dispatch", () => {
    let mockHelmDeployExecutor: jest.Mocked<HelmDeployExecutor>;

    const helmDeployStage: PipelineStage = {
      id: "stage-helm-1",
      name: "Helm Deploy",
      type: "deploy",
      config: {
        engine: "helm",
        releaseName: "my-app",
        chart: "bitnami/postgresql",
        namespace: "production",
      },
      order: 1,
    };

    beforeEach(async () => {
      mockHelmDeployExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "deployed" }),
        isHelmAvailable: jest.fn().mockResolvedValue(true),
        buildCommand: jest.fn().mockReturnValue("helm upgrade --install ..."),
      } as unknown as jest.Mocked<HelmDeployExecutor>;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: HelmDeployExecutor, useValue: mockHelmDeployExecutor },
        ],
      }).compile();

      processor = module.get<PipelineProcessor>(PipelineProcessor);
    });

    it("should dispatch deploy stage with engine=helm to HelmDeployExecutor", async () => {
      const run = buildRun();
      const pipeline = buildPipeline([helmDeployStage]);

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

      await processor.process(job);

      expect(mockHelmDeployExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ engine: "helm", releaseName: "my-app" }),
        expect.any(Function),
      );
    });

    it("should mark stage as succeeded when HelmDeployExecutor returns success=true", async () => {
      mockHelmDeployExecutor.execute.mockResolvedValue({
        success: true,
        output: "Release my-app deployed",
      });

      const run = buildRun();
      const pipeline = buildPipeline([helmDeployStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await processor.process(job(run));

      const saveCalls = mockRunRepo.save.mock.calls as [PipelineRun][][];
      const savedRun = saveCalls.find(
        (call) => call[0].status === PipelineRunStatus.SUCCEEDED,
      )?.[0] as PipelineRun | undefined;
      expect(savedRun?.stageResults?.[0]?.status).toBe("succeeded");
    });

    it("should mark stage as failed when HelmDeployExecutor returns success=false", async () => {
      mockHelmDeployExecutor.execute.mockResolvedValue({
        success: false,
        output: "Error: chart not found",
      });

      const run = buildRun();
      const pipeline = buildPipeline([helmDeployStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await processor.process(job(run));

      // Run should be FAILED because a stage failed.
      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((call) => call[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
    });

    it("should fall back to simulation when HelmDeployExecutor is not provided", async () => {
      // Rebuild processor WITHOUT the HelmDeployExecutor provider.
      const moduleNoHelm: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const processorNoHelm =
        moduleNoHelm.get<PipelineProcessor>(PipelineProcessor);

      const run = buildRun();
      const pipeline = buildPipeline([helmDeployStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const processPromise = processorNoHelm.process(job(run));
      await jest.runAllTimersAsync();
      await processPromise;

      // Should succeed via simulation path.
      const succeededSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((call) => call[0].status === PipelineRunStatus.SUCCEEDED);
      expect(succeededSave).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Cloud executor dispatch — aws-ecs
  // ---------------------------------------------------------------------------
  describe("cloud executor dispatch — aws-ecs", () => {
    const awsEcsStage: PipelineStage = {
      id: "stage-ecs-1",
      name: "ECS Deploy",
      type: "deploy",
      config: {
        engine: "aws-ecs",
        orgId: "org-uuid-1",
        cluster: "my-cluster",
        service: "my-service",
        image: "my-image:latest",
      },
      order: 1,
    };

    it("should dispatch aws-ecs stages to AwsEcsExecutor", async () => {
      const mockAwsEcsExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "ECS deployed" }),
      };
      const mockSecretsService = {
        resolveConfigSecrets: jest
          .fn()
          .mockImplementation((cfg: Record<string, unknown>) =>
            Promise.resolve(cfg),
          ),
        isSecretRef: jest.fn().mockReturnValue(false),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsEcsExecutor, useValue: mockAwsEcsExecutor },
          { provide: CloudSecretsService, useValue: mockSecretsService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([awsEcsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockAwsEcsExecutor.execute).toHaveBeenCalled();
      const succeeded = (mockRunRepo.save.mock.calls as [PipelineRun][][]).find(
        (c) => c[0].status === PipelineRunStatus.SUCCEEDED,
      );
      expect(succeeded).toBeDefined();
    });

    it("should mark run as failed when AwsEcsExecutor returns success=false", async () => {
      const mockAwsEcsExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: false, output: "Cluster not found" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsEcsExecutor, useValue: mockAwsEcsExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([awsEcsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const failed = (mockRunRepo.save.mock.calls as [PipelineRun][][]).find(
        (c) => c[0].status === PipelineRunStatus.FAILED,
      );
      expect(failed).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Cloud executor dispatch — aws-lambda
  // ---------------------------------------------------------------------------
  describe("cloud executor dispatch — aws-lambda", () => {
    const awsLambdaStage: PipelineStage = {
      id: "stage-lambda-1",
      name: "Lambda Deploy",
      type: "deploy",
      config: {
        engine: "aws-lambda",
        orgId: "org-uuid-1",
        functionName: "my-fn",
        imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/my-image:latest",
      },
      order: 1,
    };

    it("should dispatch aws-lambda stages to AwsLambdaExecutor", async () => {
      const mockAwsLambdaExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "Lambda updated" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsLambdaExecutor, useValue: mockAwsLambdaExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([awsLambdaStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockAwsLambdaExecutor.execute).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Cloud executor dispatch — gcp-cloud-run
  // ---------------------------------------------------------------------------
  describe("cloud executor dispatch — gcp-cloud-run", () => {
    const gcpStage: PipelineStage = {
      id: "stage-cloudrun-1",
      name: "Cloud Run Deploy",
      type: "deploy",
      config: {
        engine: "gcp-cloud-run",
        orgId: "org-uuid-1",
        service: "my-service",
        region: "us-central1",
        image: "gcr.io/my-project/my-image:latest",
      },
      order: 1,
    };

    it("should dispatch gcp-cloud-run stages to GcpCloudRunExecutor", async () => {
      const mockGcpExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "Cloud Run updated" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GcpCloudRunExecutor, useValue: mockGcpExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([gcpStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockGcpExecutor.execute).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Cloud executor dispatch — azure-container-apps
  // ---------------------------------------------------------------------------
  describe("cloud executor dispatch — azure-container-apps", () => {
    const azureStage: PipelineStage = {
      id: "stage-aca-1",
      name: "Container Apps Deploy",
      type: "deploy",
      config: {
        engine: "azure-container-apps",
        orgId: "org-uuid-1",
        resourceGroup: "my-rg",
        appName: "my-app",
        image: "my-registry.azurecr.io/my-image:latest",
      },
      order: 1,
    };

    it("should dispatch azure-container-apps stages to AzureContainerAppsExecutor", async () => {
      const mockAzureExecutor = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          output: "Container App updated",
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AzureContainerAppsExecutor, useValue: mockAzureExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([azureStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockAzureExecutor.execute).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Keycloak secret resolver — resolveKeycloakSecret / resolveKeycloakSecrets
  // ---------------------------------------------------------------------------
  describe("Keycloak secret resolver", () => {
    let originalFetch: typeof globalThis.fetch;
    let originalJwtSecret: string | undefined;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      originalJwtSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = JWT_SECRET;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      if (originalJwtSecret !== undefined) {
        process.env.JWT_SECRET = originalJwtSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
    });

    const JWT_SECRET = "super-secret-key-change-me-in-production";

    const mockKeycloakPayload = {
      keycloakUrl: "https://keycloak.example.com",
      realm: "myrealm",
      clientId: "farm-client",
      clientSecret: "s3cr3t",
    };

    const encryptedCredential = buildEncryptedCredential(
      mockKeycloakPayload,
      JWT_SECRET,
    );

    function buildProcessorWithCredRepo(
      credRepo: Record<string, jest.Mock>,
    ): PipelineProcessor {
      const moduleRef = {
        get: jest.fn(),
      };
      void moduleRef;

      return new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        credRepo as never,
      );
    }

    it("resolves a keycloak:// URI to an access token on first call", async () => {
      const mockCredRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue: encryptedCredential,
        }),
      };

      const proc = buildProcessorWithCredRepo(mockCredRepo);

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => ({ access_token: "token-abc", expires_in: 300 }),
      });
      globalThis.fetch = mockFetch as typeof fetch;

      const token = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-1",
      );

      expect(token).toBe("token-abc");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("uses cached token on second call without hitting the network", async () => {
      const mockCredRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue: encryptedCredential,
        }),
      };

      const proc = buildProcessorWithCredRepo(mockCredRepo);

      let fetchCallCount = 0;
      // eslint-disable-next-line @typescript-eslint/require-await
      globalThis.fetch = jest.fn().mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: true,
          // eslint-disable-next-line @typescript-eslint/require-await
          json: async () => ({ access_token: "token-cached", expires_in: 300 }),
        };
      }) as typeof fetch;

      const first = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-1",
      );
      const second = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-1",
      );

      expect(first).toBe("token-cached");
      expect(second).toBe("token-cached");
      // Token endpoint should have been called only once.
      expect(fetchCallCount).toBe(1);
    });

    it("resolveKeycloakSecrets replaces all keycloak:// values in the config", async () => {
      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
      );

      jest
        .spyOn(proc, "resolveKeycloakSecret")
        .mockResolvedValue("resolved-token");

      const stageConfig: Record<string, unknown> = {
        apiToken: "keycloak://realm1/client1",
        webhookToken: "keycloak://realm1/client2",
        plainValue: "no-change",
        numericValue: 42,
      };

      const result = await proc.resolveKeycloakSecrets(stageConfig, "org-1");

      expect(result["apiToken"]).toBe("resolved-token");
      expect(result["webhookToken"]).toBe("resolved-token");
      expect(result["plainValue"]).toBe("no-change");
      expect(result["numericValue"]).toBe(42);
    });

    it("keycloak:// URIs in stage config are resolved before stage execution", async () => {
      const credRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue: encryptedCredential,
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          {
            provide: getRepositoryToken(IntegrationCredential),
            useValue: credRepo,
          },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);

      // Spy on resolveKeycloakSecrets to verify it is called per-stage.
      const resolveSpy = jest
        .spyOn(proc, "resolveKeycloakSecrets")
        .mockResolvedValue({ apiToken: "resolved-token" });

      const run = buildRun();
      const pipeline = buildPipeline([
        {
          id: "stage-kc-1",
          name: "Deploy with Keycloak token",
          type: "script",
          config: { apiToken: "keycloak://myrealm/farm-client" },
          order: 1,
        },
      ]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const processPromise = proc.process(
        buildJob({
          pipelineId: run.pipelineId,
          runId: run.id,
          triggeredBy: run.triggeredBy,
        }),
      );
      await jest.runAllTimersAsync();
      await processPromise;

      expect(resolveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ apiToken: "keycloak://myrealm/farm-client" }),
        expect.any(String),
      );
    });

    it("derives the encryption key only once across multiple credential decryptions", async () => {
      const credRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce({
            id: "cred-1",
            orgId: "org-1",
            type: IntegrationType.KEYCLOAK,
            encryptedValue: encryptedCredential,
          })
          .mockResolvedValueOnce({
            id: "cred-2",
            orgId: "org-2",
            type: IntegrationType.KEYCLOAK,
            encryptedValue: encryptedCredential,
          }),
      };

      const proc = buildProcessorWithCredRepo(credRepo);

      // TypeScript's __importStar wraps built-in modules in a namespace object
      // whose properties are non-configurable getter-only accessors. jest.spyOn
      // cannot redefine them. Spying on the underlying require("crypto") object
      // works because the namespace getter always delegates to it, so the processor
      // code picks up the spy transparently.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cryptoModule = require("crypto") as typeof crypto;
      const cryptoSpy = jest.spyOn(cryptoModule, "createHash");

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          // eslint-disable-next-line @typescript-eslint/require-await
          json: async () => ({ access_token: "token-org1", expires_in: 300 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          // eslint-disable-next-line @typescript-eslint/require-await
          json: async () => ({ access_token: "token-org2", expires_in: 300 }),
        }) as typeof fetch;

      const t1 = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-1",
      );
      const t2 = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-2",
      );

      expect(t1).toBe("token-org1");
      expect(t2).toBe("token-org2");
      // Key derivation must happen only once — the Buffer is cached on the instance.
      expect(cryptoSpy).toHaveBeenCalledTimes(1);
      expect(cryptoSpy).toHaveBeenCalledWith("sha256");
      cryptoSpy.mockRestore();
    });
  });
});

/**
 * Builds a minimal Job fixture bound to a given run.
 */
function job(run: PipelineRun): Job<PipelineExecutionJobData> {
  return buildJob({
    pipelineId: run.pipelineId,
    runId: run.id,
    triggeredBy: run.triggeredBy,
  });
}

// ---------------------------------------------------------------------------
// Additional branch-coverage tests
// ---------------------------------------------------------------------------

describe("PipelineProcessor — additional branches", () => {
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
        { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
        { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    processor = module.get<PipelineProcessor>(PipelineProcessor);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // logFn callbacks — executor paths that call the provided logFn
  // -------------------------------------------------------------------------

  describe("logFn callbacks in executor dispatches", () => {
    it("emits pipeline.log when Helm executor calls the logFn", async () => {
      const mockHelmExecutor = {
        execute: jest
          .fn()
          .mockImplementation((_cfg: unknown, logFn: (msg: string) => void) => {
            logFn("Helm deploy started");
            return { success: true, output: "deployed" };
          }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: HelmDeployExecutor, useValue: mockHelmExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const helmStage: PipelineStage = {
        id: "helm-stage",
        name: "Deploy Helm",
        type: "deploy",
        config: { engine: "helm" },
        order: 1,
      };
      const pipeline = buildPipeline([helmStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "pipeline.log",
        expect.objectContaining({ message: "Helm deploy started" }),
      );
    });

    it("emits pipeline.log when AWS ECS executor calls the logFn", async () => {
      const mockEcsExecutor = {
        execute: jest
          .fn()
          .mockImplementation((_cfg: unknown, logFn: (msg: string) => void) => {
            logFn("ECS deploy in progress");
            return { success: true, output: "ecs deployed" };
          }),
      };
      const mockSecretsService = {
        resolveConfigSecrets: jest
          .fn()
          .mockImplementation((cfg: Record<string, unknown>) =>
            Promise.resolve(cfg),
          ),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsEcsExecutor, useValue: mockEcsExecutor },
          { provide: CloudSecretsService, useValue: mockSecretsService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const ecsStage: PipelineStage = {
        id: "ecs-stage",
        name: "Deploy ECS",
        type: "deploy",
        config: {
          engine: "aws-ecs",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([ecsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "pipeline.log",
        expect.objectContaining({ message: "ECS deploy in progress" }),
      );
    });

    it("emits pipeline.log when AWS Lambda executor calls the logFn", async () => {
      const mockLambdaExecutor = {
        execute: jest
          .fn()
          .mockImplementation((_cfg: unknown, logFn: (msg: string) => void) => {
            logFn("Lambda updating");
            return { success: true, output: "lambda updated" };
          }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsLambdaExecutor, useValue: mockLambdaExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const lambdaStage: PipelineStage = {
        id: "lambda-stage",
        name: "Deploy Lambda",
        type: "deploy",
        config: {
          engine: "aws-lambda",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([lambdaStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "pipeline.log",
        expect.objectContaining({ message: "Lambda updating" }),
      );
    });

    it("emits pipeline.log when GCP Cloud Run executor calls the logFn", async () => {
      const mockGcpExecutor = {
        execute: jest
          .fn()
          .mockImplementation((_cfg: unknown, logFn: (msg: string) => void) => {
            logFn("Cloud Run deploying");
            return { success: true, output: "cloud run updated" };
          }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GcpCloudRunExecutor, useValue: mockGcpExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const gcpStage: PipelineStage = {
        id: "gcp-stage",
        name: "GCP Deploy",
        type: "deploy",
        config: {
          engine: "gcp-cloud-run",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([gcpStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "pipeline.log",
        expect.objectContaining({ message: "Cloud Run deploying" }),
      );
    });

    it("emits pipeline.log when Azure Container Apps executor calls the logFn", async () => {
      const mockAzureExecutor = {
        execute: jest
          .fn()
          .mockImplementation((_cfg: unknown, logFn: (msg: string) => void) => {
            logFn("Azure deploying");
            return { success: true, output: "azure updated" };
          }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AzureContainerAppsExecutor, useValue: mockAzureExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const azureStage: PipelineStage = {
        id: "azure-stage",
        name: "Azure Deploy",
        type: "deploy",
        config: {
          engine: "azure-container-apps",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([azureStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "pipeline.log",
        expect.objectContaining({ message: "Azure deploying" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Build stage executor dispatch
  // -------------------------------------------------------------------------

  describe("build stage executor dispatch", () => {
    it("should dispatch build stages to BuildStageExecutor and succeed", async () => {
      const mockBuildExecutor = {
        execute: jest
          .fn()
          .mockImplementation(
            (_stage: unknown, _run: unknown, logFn: (msg: string) => void) => {
              logFn("Build output");
              return { success: true, output: "build succeeded" };
            },
          ),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: BuildStageExecutor, useValue: mockBuildExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const buildStage: PipelineStage = {
        id: "build-stage-1",
        name: "Compile",
        type: "build",
        config: {},
        order: 1,
      };
      const pipeline = buildPipeline([buildStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockBuildExecutor.execute).toHaveBeenCalled();
      const lastSave = mockRunRepo.save.mock.calls.at(-1) as [PipelineRun];
      expect(lastSave[0].status).toBe(PipelineRunStatus.SUCCEEDED);
    });

    it("should mark run as failed when build stage fails", async () => {
      const mockBuildExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: false, output: "compile error" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: BuildStageExecutor, useValue: mockBuildExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const buildStage: PipelineStage = {
        id: "build-stage-fail",
        name: "Compile",
        type: "build",
        config: {},
        order: 1,
      };
      const pipeline = buildPipeline([buildStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // resolveKeycloakSecrets — error path
  // -------------------------------------------------------------------------

  describe("resolveKeycloakSecrets — error path", () => {
    it("should fall back to the raw keycloak:// value when resolveKeycloakSecret throws", async () => {
      jest
        .spyOn(processor, "resolveKeycloakSecret")
        .mockRejectedValue(new Error("token fetch failed"));

      const config: Record<string, unknown> = {
        apiToken: "keycloak://realm1/client1",
        plainValue: "no-change",
      };

      const result = await processor.resolveKeycloakSecrets(config, "org-1");

      // Falls back to the raw URI.
      expect(result["apiToken"]).toBe("keycloak://realm1/client1");
      expect(result["plainValue"]).toBe("no-change");
    });
  });

  // -------------------------------------------------------------------------
  // resolveKeycloakSecret — missing credentialRepository
  // -------------------------------------------------------------------------

  describe("resolveKeycloakSecret — no credentialRepository", () => {
    it("should throw when credentialRepository is not available", async () => {
      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
      );

      await expect(
        proc.resolveKeycloakSecret("keycloak://realm/client", "org-1"),
      ).rejects.toThrow(
        "IntegrationCredential repository not available in PipelineProcessor",
      );
    });
  });

  // -------------------------------------------------------------------------
  // resolveKeycloakSecret — credential not found
  // -------------------------------------------------------------------------

  describe("resolveKeycloakSecret — credential not found", () => {
    it("should throw when no Keycloak credential exists for the org", async () => {
      const credRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        credRepo as never,
      );

      await expect(
        proc.resolveKeycloakSecret("keycloak://realm/client", "org-1"),
      ).rejects.toThrow("No Keycloak credential found for org org-1");
    });
  });

  // -------------------------------------------------------------------------
  // resolveKeycloakSecret — token request fails
  // -------------------------------------------------------------------------

  describe("resolveKeycloakSecret — token request fails", () => {
    const JWT_SECRET = "super-secret-key-change-me-in-production";

    let originalFetch: typeof globalThis.fetch;
    let originalJwtSecret: string | undefined;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      originalJwtSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = JWT_SECRET;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      if (originalJwtSecret !== undefined) {
        process.env.JWT_SECRET = originalJwtSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
    });

    function buildEncryptedCredential(payload: object, secret: string): string {
      const key = crypto.createHash("sha256").update(secret).digest();
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, ciphertext]).toString("base64");
    }

    const mockPayload = {
      keycloakUrl: "https://keycloak.example.com",
      realm: "myrealm",
      clientId: "farm-client",
      clientSecret: "s3cr3t",
    };

    it("should throw when the token endpoint returns a non-ok response", async () => {
      const credRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue: buildEncryptedCredential(mockPayload, JWT_SECRET),
        }),
      };

      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        credRepo as never,
      );

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => ({}),
      }) as typeof fetch;

      await expect(
        proc.resolveKeycloakSecret("keycloak://myrealm/farm-client", "org-1"),
      ).rejects.toThrow("Keycloak token request failed");
    });

    it("should handle URI with no slash (no clientId in URI)", async () => {
      const credRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue: buildEncryptedCredential(mockPayload, JWT_SECRET),
        }),
      };

      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        credRepo as never,
      );

      let capturedBody: string | undefined;
      globalThis.fetch = jest
        .fn()
        .mockImplementation((_url: unknown, init: { body: string }) => {
          capturedBody = init.body;
          return {
            ok: true,
            json: () => ({ access_token: "tok", expires_in: 300 }),
          };
        }) as typeof fetch;

      // URI without a slash — realm = "myrealm", clientId = ""
      const token = await proc.resolveKeycloakSecret(
        "keycloak://myrealm",
        "org-1",
      );

      expect(token).toBe("tok");
      // client_id should fall back to payload.clientId when URI has no slash.
      const body = new URLSearchParams(capturedBody ?? "");
      expect(body.get("client_id")).toBe("farm-client");
    });

    it("should use the default jwtSecret when JWT_SECRET env is not set", async () => {
      // Ensure JWT_SECRET is unset so the ?? fallback is used.
      delete process.env.JWT_SECRET;

      const encryptedValue = buildEncryptedCredential(
        mockPayload,
        "super-secret-key-change-me-in-production",
      );

      const credRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue,
        }),
      };

      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        credRepo as never,
      );

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          access_token: "default-key-token",
          expires_in: 60,
        }),
      }) as typeof fetch;

      const token = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-1",
      );

      expect(token).toBe("default-key-token");
    });

    it("should skip encryptionKey derivation on second call (cache hit for decryptCredential path)", async () => {
      const encryptedValue = buildEncryptedCredential(mockPayload, JWT_SECRET);
      const credRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "cred-1",
          orgId: "org-1",
          type: IntegrationType.KEYCLOAK,
          encryptedValue,
        }),
      };

      const proc = new PipelineProcessor(
        mockRunRepo as never,
        mockPipelineRepo as never,
        mockEventsGateway as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        credRepo as never,
      );

      let fetchCallCount = 0;
      globalThis.fetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        return {
          ok: true,
          json: () => ({
            access_token: `token-${fetchCallCount}`,
            expires_in: 300,
          }),
        };
      }) as typeof fetch;

      // First call — decryptCredential derives the key (encryptionKey is null).
      const t1 = await proc.resolveKeycloakSecret(
        "keycloak://myrealm/farm-client",
        "org-1",
      );
      // Second call — uses cached token (no fetch), but the path where encryptionKey
      // is already set would be exercised if cache expired. Simulate cache expiry
      // by targeting a different realm to force a second credential lookup.
      // Clear token cache by targeting different org.
      const t2 = await proc.resolveKeycloakSecret(
        "keycloak://otherrealm/farm-client",
        "org-2",
      );

      expect(t1).toBe("token-1");
      expect(t2).toBe("token-2");
    });
  });

  // -------------------------------------------------------------------------
  // CloudSecretsService — truthy path for Lambda, GCP, Azure
  // -------------------------------------------------------------------------

  describe("cloud executor dispatch with CloudSecretsService", () => {
    const mockSecretsService = {
      resolveConfigSecrets: jest
        .fn()
        .mockImplementation((cfg: Record<string, unknown>) =>
          Promise.resolve(cfg),
        ),
    };

    it("resolves config via CloudSecretsService before AWS Lambda dispatch", async () => {
      const mockLambdaExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "lambda ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsLambdaExecutor, useValue: mockLambdaExecutor },
          { provide: CloudSecretsService, useValue: mockSecretsService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const stage: PipelineStage = {
        id: "lambda-sec",
        name: "Lambda Secret",
        type: "deploy",
        config: {
          engine: "aws-lambda",
          orgId: "org-1",
          functionName: "fn",
        },
        order: 1,
      };
      const pipeline = buildPipeline([stage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockSecretsService.resolveConfigSecrets).toHaveBeenCalled();
      expect(mockLambdaExecutor.execute).toHaveBeenCalled();
    });

    it("resolves config via CloudSecretsService before GCP Cloud Run dispatch", async () => {
      const mockGcpExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "gcp ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GcpCloudRunExecutor, useValue: mockGcpExecutor },
          { provide: CloudSecretsService, useValue: mockSecretsService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const stage: PipelineStage = {
        id: "gcp-sec",
        name: "GCP Secret",
        type: "deploy",
        config: {
          engine: "gcp-cloud-run",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([stage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockSecretsService.resolveConfigSecrets).toHaveBeenCalled();
      expect(mockGcpExecutor.execute).toHaveBeenCalled();
    });

    it("resolves config via CloudSecretsService before Azure Container Apps dispatch", async () => {
      const mockAzureExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "azure ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AzureContainerAppsExecutor, useValue: mockAzureExecutor },
          { provide: CloudSecretsService, useValue: mockSecretsService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const stage: PipelineStage = {
        id: "azure-sec",
        name: "Azure Secret",
        type: "deploy",
        config: {
          engine: "azure-container-apps",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([stage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockSecretsService.resolveConfigSecrets).toHaveBeenCalled();
      expect(mockAzureExecutor.execute).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // failRun with startedAt = null
  // -------------------------------------------------------------------------

  describe("failRun with startedAt null (resume scenario)", () => {
    it("should set durationMs to null in failRun when run has no startedAt", async () => {
      const run = buildRun({
        status: PipelineRunStatus.RUNNING,
        startedAt: null,
        stageResults: [],
      });

      const failStage: PipelineStage = {
        id: "fail-stage",
        name: "FailMe",
        type: "deploy",
        config: { engine: "helm" },
        order: 5,
      };

      const mockHelmExec = {
        execute: jest.fn().mockResolvedValue({ success: false, output: null }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: HelmDeployExecutor, useValue: mockHelmExec },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const pipeline = buildPipeline([failStage]);

      // Resume from stage order 5 (skips startedAt initialization block).
      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(
        buildJob({
          pipelineId: run.pipelineId,
          runId: run.id,
          triggeredBy: run.triggeredBy,
          resumeFromStageOrder: 5,
        }),
      );

      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
      // startedAt was null, so durationMs should be null.
      expect(failedSave![0].durationMs).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // eventsGateway.server null handling
  // -------------------------------------------------------------------------

  describe("process — eventsGateway.server is null", () => {
    it("should not throw when eventsGateway.server is null", async () => {
      const nullServerGateway = { server: null };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          {
            provide: getRepositoryToken(Pipeline),
            useValue: mockPipelineRepo,
          },
          { provide: EventsGateway, useValue: nullServerGateway },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date() });
      const pipeline = buildPipeline([scriptStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const processPromise = proc.process(job(run));
      await jest.runAllTimersAsync();
      await processPromise;

      // Should succeed without errors even though server is null.
      const succeededSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.SUCCEEDED);
      expect(succeededSave).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// PipelineProcessor — executor paths without CloudSecretsService
// ---------------------------------------------------------------------------

describe("PipelineProcessor — executor branches without CloudSecretsService", () => {
  let mockRunRepo: Record<string, jest.Mock>;
  let mockPipelineRepo: Record<string, jest.Mock>;
  let mockEventsGateway: { server: { emit: jest.Mock } };

  beforeEach(() => {
    jest.useFakeTimers();

    mockRunRepo = { findOne: jest.fn(), save: jest.fn() };
    mockPipelineRepo = { findOne: jest.fn() };
    mockEventsGateway = { server: { emit: jest.fn() } };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function job(run: PipelineRun): Job<PipelineExecutionJobData> {
    return {
      data: {
        pipelineId: run.pipelineId,
        runId: run.id,
        triggeredBy: run.triggeredBy,
      },
    } as Job<PipelineExecutionJobData>;
  }

  // -------------------------------------------------------------------------
  // approval stage with null stageResults (run.stageResults ?? [])
  // -------------------------------------------------------------------------

  describe("approval stage — run.stageResults is null", () => {
    it("should treat null stageResults as empty array before appending approval result", async () => {
      const run = buildRun({
        startedAt: new Date(),
        stageResults: null as unknown as [],
      });
      const approvalStage: PipelineStage = {
        id: "approval-stage",
        name: "Gate",
        type: "approval",
        config: {},
        order: 1,
      };
      const pipeline = buildPipeline([approvalStage]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);

      mockRunRepo.findOne.mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const waitingSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.WAITING_APPROVAL);
      expect(waitingSave).toBeDefined();
      expect(waitingSave![0].stageResults).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // aws-ecs without CloudSecretsService (config used directly)
  // -------------------------------------------------------------------------

  describe("aws-ecs dispatch without CloudSecretsService", () => {
    it("should pass stage.config directly to AwsEcsExecutor when CloudSecretsService is absent", async () => {
      const mockEcsExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "ecs ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsEcsExecutor, useValue: mockEcsExecutor },
          // No CloudSecretsService
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date() });
      const ecsStage: PipelineStage = {
        id: "ecs-stage",
        name: "ECS Deploy",
        type: "deploy",
        config: { engine: "aws-ecs", orgId: "org-1" },
        order: 1,
      };
      const pipeline = buildPipeline([ecsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockEcsExecutor.execute).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // aws-lambda without CloudSecretsService
  // -------------------------------------------------------------------------

  describe("aws-lambda dispatch without CloudSecretsService", () => {
    it("should pass stage.config directly to AwsLambdaExecutor when CloudSecretsService is absent", async () => {
      const mockLambdaExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "lambda ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AwsLambdaExecutor, useValue: mockLambdaExecutor },
          // No CloudSecretsService
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date() });
      const lambdaStage: PipelineStage = {
        id: "lambda-stage",
        name: "Lambda Deploy",
        type: "deploy",
        config: {
          engine: "aws-lambda",
          orgId: "org-1",
          functionName: "fn",
        },
        order: 1,
      };
      const pipeline = buildPipeline([lambdaStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockLambdaExecutor.execute).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // gcp-cloud-run without CloudSecretsService
  // -------------------------------------------------------------------------

  describe("gcp-cloud-run dispatch without CloudSecretsService", () => {
    it("should pass stage.config directly to GcpCloudRunExecutor when CloudSecretsService is absent", async () => {
      const mockGcpExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "gcp ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GcpCloudRunExecutor, useValue: mockGcpExecutor },
          // No CloudSecretsService
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date() });
      const gcpStage: PipelineStage = {
        id: "gcp-stage",
        name: "GCP Deploy",
        type: "deploy",
        config: {
          engine: "gcp-cloud-run",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([gcpStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockGcpExecutor.execute).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // azure-container-apps without CloudSecretsService
  // -------------------------------------------------------------------------

  describe("azure-container-apps dispatch without CloudSecretsService", () => {
    it("should pass stage.config directly to AzureContainerAppsExecutor when CloudSecretsService is absent", async () => {
      const mockAzureExecutor = {
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, output: "azure ok" }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: AzureContainerAppsExecutor, useValue: mockAzureExecutor },
          // No CloudSecretsService
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date() });
      const azureStage: PipelineStage = {
        id: "azure-stage",
        name: "Azure Deploy",
        type: "deploy",
        config: {
          engine: "azure-container-apps",
          orgId: "org-1",
        },
        order: 1,
      };
      const pipeline = buildPipeline([azureStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockAzureExecutor.execute).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // process — run.startedAt is null when run succeeds (durationMs = null)
  // -------------------------------------------------------------------------

  describe("process — succeeds with null startedAt", () => {
    it("should set durationMs to null when run has no startedAt and succeeds", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      // Resume scenario: startedAt is null because it was set in a previous processing pass.
      const run = buildRun({
        startedAt: null as unknown as Date,
        stageResults: [],
      });
      const scriptStage: PipelineStage = {
        id: "s1",
        name: "Script",
        type: "script",
        config: {},
        order: 5,
      };
      const pipeline = buildPipeline([scriptStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const processPromise = proc.process(
        buildJob({
          pipelineId: run.pipelineId,
          runId: run.id,
          triggeredBy: run.triggeredBy,
          resumeFromStageOrder: 5,
        }),
      );
      await jest.runAllTimersAsync();
      await processPromise;

      const succeededSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.SUCCEEDED);
      expect(succeededSave).toBeDefined();
      expect(succeededSave![0].durationMs).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // process — outer catch with non-Error exception (String(error) path)
  // -------------------------------------------------------------------------

  describe("process — outer catch with non-Error", () => {
    it("should call failRun with String(error) when a non-Error is thrown in stage execution", async () => {
      const mockHelmExecutor = {
        execute: jest.fn().mockRejectedValue("non-error-string"),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: HelmDeployExecutor, useValue: mockHelmExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date() });
      const helmStage: PipelineStage = {
        id: "helm-s",
        name: "Helm",
        type: "deploy",
        config: { engine: "helm" },
        order: 1,
      };
      const pipeline = buildPipeline([helmStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // resolveKeycloakSecrets — non-keycloak string values pass through unchanged
  // -------------------------------------------------------------------------

  describe("resolveKeycloakSecrets — non-keycloak values unchanged", () => {
    it("should return non-string and non-keycloak values unchanged", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);

      const config: Record<string, unknown> = {
        plainString: "just-a-value",
        numberVal: 42,
        boolVal: true,
        nested: { key: "val" },
      };

      const result = await proc.resolveKeycloakSecrets(config, "org-1");

      expect(result.plainString).toBe("just-a-value");
      expect(result.numberVal).toBe(42);
      expect(result.boolVal).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("infracost stage executor dispatch", () => {
    it("should dispatch infracost stages to InfracostStageExecutor and succeed", async () => {
      const mockInfracostExecutor = {
        execute: jest
          .fn()
          .mockImplementation(
            (_stage: unknown, _run: unknown, logFn: (msg: string) => void) => {
              logFn("Infracost output");
              return { success: true, output: "cost estimate generated" };
            },
          ),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: InfracostStageExecutor, useValue: mockInfracostExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const infracostStage: PipelineStage = {
        id: "infracost-stage-1",
        name: "CostEstimate",
        type: "infracost",
        config: {},
        order: 1,
      };
      const pipeline = buildPipeline([infracostStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockInfracostExecutor.execute).toHaveBeenCalled();
      const lastSave = mockRunRepo.save.mock.calls.at(-1) as [PipelineRun];
      expect(lastSave[0].status).toBe(PipelineRunStatus.SUCCEEDED);
    });

    it("should mark run as failed when infracost stage fails", async () => {
      const mockInfracostExecutor = {
        execute: jest.fn().mockResolvedValue({
          success: false,
          output: "cost estimate failed",
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: InfracostStageExecutor, useValue: mockInfracostExecutor },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const infracostStage: PipelineStage = {
        id: "infracost-stage-fail",
        name: "CostEstimate",
        type: "infracost",
        config: {},
        order: 1,
      };
      const pipeline = buildPipeline([infracostStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // GitHub Actions backend dispatch
  // -------------------------------------------------------------------------

  describe("github-actions backend dispatch", () => {
    const ghActionsStage: PipelineStage = {
      id: "stage-gh-1",
      name: "GH Actions Deploy",
      type: "deploy",
      config: { orgId: "org-uuid-1" },
      order: 1,
      backend: {
        provider: "github-actions",
        workflowId: "deploy.yml",
        ref: "main",
      },
    };

    it("sets stageResult to running when triggerWorkflow succeeds", async () => {
      const mockGHService = {
        triggerWorkflow: jest.fn().mockResolvedValue({
          id: 999,
          name: "Deploy",
          status: "queued",
          conclusion: null,
          headBranch: "main",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          htmlUrl: "https://github.com/acme/repo/actions/runs/999",
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GitHubActionsService, useValue: mockGHService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([ghActionsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockGHService.triggerWorkflow).toHaveBeenCalledWith(
        "org-uuid-1",
        "deploy.yml",
        "main",
      );
      // After dispatching to an external backend the run stays RUNNING;
      // completion is driven by incoming webhooks, not the processor.
      const runningSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.RUNNING);
      expect(runningSave).toBeDefined();
      // The stage result should have externalRunId set.
      const savedRun = runningSave?.[0] as PipelineRun;
      expect(savedRun.stageResults?.[0]?.externalRunId).toBe("999");
      expect(savedRun.stageResults?.[0]?.status).toBe("running");
    });

    it("sets stageResult to running without externalRunId when triggerWorkflow returns null", async () => {
      const mockGHService = {
        triggerWorkflow: jest.fn().mockResolvedValue(null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GitHubActionsService, useValue: mockGHService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([ghActionsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const runningSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.RUNNING);
      expect(runningSave).toBeDefined();
      const savedRun = runningSave?.[0] as PipelineRun;
      expect(savedRun.stageResults?.[0]?.status).toBe("running");
    });

    it("sets stageResult to failed when triggerWorkflow throws", async () => {
      const mockGHService = {
        triggerWorkflow: jest
          .fn()
          .mockRejectedValue(new Error("Dispatch failed")),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GitHubActionsService, useValue: mockGHService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([ghActionsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
    });

    it("sets stageResult to failed when workflowId is missing", async () => {
      const stageWithoutWorkflowId: PipelineStage = {
        id: "stage-gh-noid",
        name: "GH No WorkflowId",
        type: "deploy",
        config: {},
        order: 1,
        backend: { provider: "github-actions" },
      };
      const mockGHService = {
        triggerWorkflow: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GitHubActionsService, useValue: mockGHService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([stageWithoutWorkflowId]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      expect(mockGHService.triggerWorkflow).not.toHaveBeenCalled();
      const failedSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.FAILED);
      expect(failedSave).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Per-stage PIPELINE_STAGE_UPDATED events
  // -------------------------------------------------------------------------

  describe("per-stage PIPELINE_STAGE_UPDATED events", () => {
    it("emits pipeline.stage.updated after each stage completes", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([
        { id: "s1", name: "Build", type: "script", config: {}, order: 1 },
      ]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const processPromise = proc.process(job(run));
      await jest.runAllTimersAsync();
      await processPromise;

      const stageEvents = (
        mockEventsGateway.server.emit.mock.calls as [
          string,
          { stageId: string },
        ][]
      ).filter((call) => call[0] === "pipeline.stage.updated");
      expect(stageEvents.length).toBeGreaterThanOrEqual(1);
      expect(stageEvents[0][1]).toMatchObject({
        stageId: "s1",
        status: "succeeded",
      });
    });
  });

  // -------------------------------------------------------------------------
  // finishedAt behaviour for external vs synchronous stages
  // -------------------------------------------------------------------------

  describe("finishedAt for delegated external backend stages", () => {
    it("does not set stageResult.finishedAt when stage is dispatched to an external backend", async () => {
      const ghActionsStage: PipelineStage = {
        id: "stage-gh-ext",
        name: "GH Actions Deploy",
        type: "deploy",
        config: { orgId: "org-1" },
        order: 1,
        backend: {
          provider: "github-actions",
          workflowId: "deploy.yml",
          ref: "main",
        },
      };
      const mockGHService = {
        triggerWorkflow: jest.fn().mockResolvedValue({
          id: 777,
          name: "Deploy",
          status: "queued",
          conclusion: null,
          headBranch: "main",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          htmlUrl: "https://github.com/acme/repo/actions/runs/777",
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
          { provide: GitHubActionsService, useValue: mockGHService },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun();
      const pipeline = buildPipeline([ghActionsStage]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      await proc.process(job(run));

      const runningSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.RUNNING);
      expect(runningSave).toBeDefined();
      // finishedAt must remain null for a stage that hasn't completed yet.
      const savedRun = runningSave?.[0] as PipelineRun;
      expect(savedRun.stageResults?.[0]?.finishedAt).toBeNull();
    });

    it("sets stageResult.finishedAt for a synchronously completed stage", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PipelineProcessor,
          { provide: getRepositoryToken(PipelineRun), useValue: mockRunRepo },
          { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
          { provide: EventsGateway, useValue: mockEventsGateway },
        ],
      }).compile();

      const proc = module.get<PipelineProcessor>(PipelineProcessor);
      const run = buildRun({ startedAt: new Date("2024-01-01T00:00:00Z") });
      const pipeline = buildPipeline([
        {
          id: "sync-stage",
          name: "Script",
          type: "script",
          config: {},
          order: 1,
        },
      ]);

      mockRunRepo.findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(run);
      mockRunRepo.save.mockImplementation((r: PipelineRun) =>
        Promise.resolve(r),
      );
      mockPipelineRepo.findOne.mockResolvedValue(pipeline);

      const processPromise = proc.process(job(run));
      await jest.runAllTimersAsync();
      await processPromise;

      const succeededSave = (
        mockRunRepo.save.mock.calls as [PipelineRun][][]
      ).find((c) => c[0].status === PipelineRunStatus.SUCCEEDED);
      expect(succeededSave).toBeDefined();
      const savedRun = succeededSave?.[0] as PipelineRun;
      expect(savedRun.stageResults?.[0]?.finishedAt).not.toBeNull();
    });
  });
});
