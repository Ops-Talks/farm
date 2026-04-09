import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InfracostStageExecutor } from "./infracost-stage.executor";
import { PipelineRun } from "./entities/pipeline-run.entity";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineStage } from "./entities/pipeline.entity";
import { PipelineRunStatus } from "./entities/pipeline-run.entity";

// ---------------------------------------------------------------------------
// Mock child_process so no real shell is ever invoked.
// ---------------------------------------------------------------------------
const mockExecFileImpl = jest.fn();

jest.mock("child_process", () => ({
  execFile: (
    file: string,
    args: string[],
    optsOrCb: unknown,
    maybeCb?: unknown,
  ) => {
    const cb = typeof maybeCb === "function" ? maybeCb : optsOrCb;
    mockExecFileImpl(file, args, cb);
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function buildRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: "run-uuid-1",
    pipelineId: "pipeline-uuid-1",
    status: PipelineRunStatus.RUNNING,
    triggeredBy: "user-uuid-1",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    logs: null,
    stageResults: null,
    metadata: null,
    pipeline: {} as Pipeline,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  } as unknown as PipelineRun;
}

function buildStage(config: Record<string, unknown> = {}): PipelineStage {
  return {
    id: "stage-infracost-1",
    name: "Infracost Analysis",
    type: "infracost",
    config,
    order: 1,
  };
}

/** Minimal valid infracost JSON output. */
const VALID_INFRACOST_RESULT = {
  totalMonthlyCost: "10.00",
  diffMonthlyCost: "2.50",
  currency: "USD",
  projects: [
    {
      name: "my-terraform",
      pastBreakdown: { totalMonthlyCost: "7.50" },
      breakdown: { totalMonthlyCost: "10.00" },
      diff: { totalMonthlyCost: "2.50" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("InfracostStageExecutor", () => {
  let executor: InfracostStageExecutor;
  let runRepository: jest.Mocked<Repository<PipelineRun>>;

  beforeEach(async () => {
    mockExecFileImpl.mockReset();

    const mockRepo = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfracostStageExecutor,
        {
          provide: getRepositoryToken(PipelineRun),
          useValue: mockRepo,
        },
      ],
    }).compile();

    executor = module.get<InfracostStageExecutor>(InfracostStageExecutor);
    runRepository = module.get(getRepositoryToken(PipelineRun));
  });

  // -------------------------------------------------------------------------
  describe("isInfracostAvailable()", () => {
    it("returns true when infracost --version succeeds", async () => {
      mockExecFileImpl.mockImplementation((_file, _args, cb) => {
        (cb as (err: null, result: { stdout: string; stderr: string }) => void)(
          null,
          { stdout: "infracost v0.10.0", stderr: "" },
        );
      });
      await expect(executor.isInfracostAvailable()).resolves.toBe(true);
    });

    it("returns false when infracost --version throws", async () => {
      mockExecFileImpl.mockImplementation((_file, _args, cb) => {
        (cb as (err: Error) => void)(new Error("not found"));
      });
      await expect(executor.isInfracostAvailable()).resolves.toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("execute()", () => {
    const emitLog = jest.fn();

    beforeEach(() => {
      emitLog.mockReset();
    });

    it("returns { success: false } when infracost binary is not found", async () => {
      // --version call fails → binary not available
      mockExecFileImpl.mockImplementation((_file, _args, cb) => {
        (cb as (err: Error) => void)(new Error("ENOENT"));
      });

      const run = buildRun();
      const stage = buildStage();
      const result = await executor.execute(stage, run, emitLog);

      expect(result.success).toBe(false);
      expect(result.output).toBe("infracost binary not found in PATH");
    });

    it("returns { success: true } and persists result to run.metadata.infracost", async () => {
      let callCount = 0;
      mockExecFileImpl.mockImplementation((_file, args, cb) => {
        callCount++;
        if (callCount === 1) {
          // --version check
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          // diff call
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, {
            stdout: JSON.stringify(VALID_INFRACOST_RESULT),
            stderr: "",
          });
        }
      });

      runRepository.save.mockResolvedValue({} as PipelineRun);

      const run = buildRun();
      const stage = buildStage({ terraformDir: "./infra" });
      const result = await executor.execute(stage, run, emitLog);

      expect(result.success).toBe(true);
      expect(JSON.parse(result.output)).toMatchObject({
        totalMonthlyCost: "10.00",
        currency: "USD",
      });
      expect(run.metadata?.infracost).toMatchObject({
        totalMonthlyCost: "10.00",
        currency: "USD",
      });
      expect(runRepository.save).toHaveBeenCalledWith(run);
    });

    it("defaults terraformDir to '.' when not set in config", async () => {
      let callCount = 0;
      const capturedArgs: string[][] = [];
      mockExecFileImpl.mockImplementation((_file, args, cb) => {
        callCount++;
        capturedArgs.push(args as string[]);
        if (callCount === 1) {
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, {
            stdout: JSON.stringify(VALID_INFRACOST_RESULT),
            stderr: "",
          });
        }
      });

      runRepository.save.mockResolvedValue({} as PipelineRun);

      const run = buildRun();
      const stage = buildStage(); // no terraformDir
      await executor.execute(stage, run, emitLog);

      // Second call is the diff invocation; its args should include '.'
      const diffArgs = capturedArgs[1];
      expect(diffArgs).toContain(".");
    });

    it("returns { success: false, output: 'infracost: invalid JSON output' } on malformed JSON", async () => {
      let callCount = 0;
      mockExecFileImpl.mockImplementation((_file, _args, cb) => {
        callCount++;
        if (callCount === 1) {
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, { stdout: "not valid JSON {{{{", stderr: "" });
        }
      });

      const run = buildRun();
      const stage = buildStage();
      const result = await executor.execute(stage, run, emitLog);

      expect(result.success).toBe(false);
      expect(result.output).toBe("infracost: invalid JSON output");
    });

    it("returns { success: false } when a non-Error value is thrown", async () => {
      // --version succeeds, diff throws a non-Error
      let callCount = 0;
      mockExecFileImpl.mockImplementation((_file, _args, cb) => {
        callCount++;
        if (callCount === 1) {
          (
            cb as (
              err: null,
              result: { stdout: string; stderr: string },
            ) => void
          )(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          // Simulate a non-Error throw by calling cb with a plain string error
          (cb as (err: string) => void)("unexpected string error");
        }
      });

      const run = buildRun();
      const stage = buildStage();
      const result = await executor.execute(stage, run, emitLog);

      // The outer catch should wrap the error
      expect(result.success).toBe(false);
    });
  });
});
