import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InfracostStageExecutor } from "./infracost-stage.executor";
import { PipelineRun } from "./entities/pipeline-run.entity";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineStage } from "./entities/pipeline.entity";
import { PipelineRunStatus } from "./entities/pipeline-run.entity";
import { FinOpsService } from "../finops/finops.service";

// ---------------------------------------------------------------------------
// Mock child_process so no real shell is ever invoked.
// Node's util.promisify(execFile) uses a custom __promisify__ that resolves
// to { stdout, stderr }. The callback signature is (err, stdout, stderr).
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

/**
 * Helper that configures the mock execFile callback to resolve with an
 * { stdout, stderr } object. Standard util.promisify wraps (err, result)
 * callbacks, so passing a single object ensures the destructuring in the
 * executor's `const { stdout } = await execFileAsync(...)` works correctly.
 */
function execFileSuccess(stdout: string, stderr = "") {
  return (_file: string, _args: string[], cb: (err: null, result: { stdout: string; stderr: string }) => void) => {
    cb(null, { stdout, stderr });
  };
}

function execFileError(err: unknown) {
  return (_file: string, _args: string[], cb: (err: unknown) => void) => {
    cb(err);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("InfracostStageExecutor", () => {
  let executor: InfracostStageExecutor;
  let runRepository: jest.Mocked<Repository<PipelineRun>>;
  let finOpsService: { upsertCostEstimate: jest.Mock };

  beforeEach(async () => {
    mockExecFileImpl.mockReset();

    const mockRepo = {
      save: jest.fn(),
    };

    finOpsService = {
      upsertCostEstimate: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfracostStageExecutor,
        {
          provide: getRepositoryToken(PipelineRun),
          useValue: mockRepo,
        },
        {
          provide: FinOpsService,
          useValue: finOpsService,
        },
      ],
    }).compile();

    executor = module.get<InfracostStageExecutor>(InfracostStageExecutor);
    runRepository = module.get(getRepositoryToken(PipelineRun));
  });

  // -------------------------------------------------------------------------
  describe("isInfracostAvailable()", () => {
    it("returns true when infracost --version succeeds", async () => {
      mockExecFileImpl.mockImplementation(
        execFileSuccess("infracost v0.10.0"),
      );
      await expect(executor.isInfracostAvailable()).resolves.toBe(true);
    });

    it("returns false when infracost --version throws", async () => {
      mockExecFileImpl.mockImplementation(
        execFileError(new Error("not found")),
      );
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
      mockExecFileImpl.mockImplementation(
        execFileError(new Error("ENOENT")),
      );

      const run = buildRun();
      const stage = buildStage();
      const result = await executor.execute(stage, run, emitLog);

      expect(result.success).toBe(false);
      expect(result.output).toBe("infracost binary not found in PATH");
    });

    it("returns { success: true } and persists result to run.metadata.infracost", async () => {
      let callCount = 0;
      mockExecFileImpl.mockImplementation((_file: string, _args: string[], cb: (err: null, result: { stdout: string; stderr: string }) => void) => {
        callCount++;
        if (callCount === 1) {
          cb(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          cb(null, { stdout: JSON.stringify(VALID_INFRACOST_RESULT), stderr: "" });
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

    it("persists cost estimate via FinOpsService when componentId is in config", async () => {
      let callCount = 0;
      mockExecFileImpl.mockImplementation((_file: string, _args: string[], cb: (err: null, result: { stdout: string; stderr: string }) => void) => {
        callCount++;
        if (callCount === 1) {
          cb(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          cb(null, { stdout: JSON.stringify(VALID_INFRACOST_RESULT), stderr: "" });
        }
      });

      runRepository.save.mockResolvedValue({} as PipelineRun);

      const run = buildRun();
      const stage = buildStage({ componentId: "comp-uuid-1" });
      await executor.execute(stage, run, emitLog);

      expect(finOpsService.upsertCostEstimate).toHaveBeenCalledWith(
        "comp-uuid-1",
        expect.objectContaining({
          estimatedMonthlyCost: 10.0,
          diffMonthlyCost: 2.5,
          currency: "USD",
          pipelineRunId: "run-uuid-1",
        }),
      );
    });

    it("defaults terraformDir to '.' when not set in config", async () => {
      let callCount = 0;
      const capturedArgs: string[][] = [];
      mockExecFileImpl.mockImplementation((_file: string, args: string[], cb: (err: null, result: { stdout: string; stderr: string }) => void) => {
        callCount++;
        capturedArgs.push(args);
        if (callCount === 1) {
          cb(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          cb(null, { stdout: JSON.stringify(VALID_INFRACOST_RESULT), stderr: "" });
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
      mockExecFileImpl.mockImplementation((_file: string, _args: string[], cb: (err: null | unknown, result?: { stdout: string; stderr: string }) => void) => {
        callCount++;
        if (callCount === 1) {
          cb(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          cb(null, { stdout: "not valid JSON {{{{", stderr: "" });
        }
      });

      const run = buildRun();
      const stage = buildStage();
      const result = await executor.execute(stage, run, emitLog);

      expect(result.success).toBe(false);
      expect(result.output).toBe("infracost: invalid JSON output");
    });

    it("returns { success: false } when a non-Error value is thrown", async () => {
      let callCount = 0;
      mockExecFileImpl.mockImplementation((_file: string, _args: string[], cb: (err: unknown) => void) => {
        callCount++;
        if (callCount === 1) {
          (cb as (err: null, result: { stdout: string; stderr: string }) => void)(null, { stdout: "infracost v0.10.0", stderr: "" });
        } else {
          cb("unexpected string error");
        }
      });

      const run = buildRun();
      const stage = buildStage();
      const result = await executor.execute(stage, run, emitLog);

      expect(result.success).toBe(false);
    });
  });
});
