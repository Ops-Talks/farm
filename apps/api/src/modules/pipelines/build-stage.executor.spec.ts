import { Test, TestingModule } from "@nestjs/testing";
import { BuildStageExecutor, BuildStageConfig } from "./build-stage.executor";
import { PipelineRun } from "./entities/pipeline-run.entity";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineStage } from "./entities/pipeline.entity";
import { PipelineRunStatus } from "./entities/pipeline-run.entity";

// ---------------------------------------------------------------------------
// Mock child_process so no real shell is ever invoked.
// ---------------------------------------------------------------------------
const mockExecImpl = jest.fn();

jest.mock("child_process", () => ({
  exec: (cmd: string, optsOrCb: unknown, maybeCb?: unknown) => {
    const cb = typeof maybeCb === "function" ? maybeCb : optsOrCb;
    mockExecImpl(cmd, cb);
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function buildRun(metadata?: Record<string, unknown>): PipelineRun {
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
    pipeline: {} as Pipeline,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...(metadata ? { metadata } : {}),
  } as unknown as PipelineRun;
}

function buildStage(config: Partial<BuildStageConfig> = {}): PipelineStage {
  return {
    id: "stage-build-1",
    name: "Build Image",
    type: "build",
    config: {
      tag: "myregistry.io/myapp:{{version}}-{{commitSha}}",
      ...config,
    },
    order: 1,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("BuildStageExecutor", () => {
  let executor: BuildStageExecutor;

  beforeEach(async () => {
    mockExecImpl.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BuildStageExecutor],
    }).compile();

    executor = module.get<BuildStageExecutor>(BuildStageExecutor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(executor).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // renderTag
  // ---------------------------------------------------------------------------
  describe("renderTag", () => {
    it("should replace {{version}} with run metadata version", () => {
      const run = buildRun({ version: "1.2.3" });
      const tag = executor.renderTag("myregistry.io/myapp:{{version}}", run);
      expect(tag).toBe("myregistry.io/myapp:1.2.3");
    });

    it("should replace {{commitSha}} with the first 7 chars of the commit SHA", () => {
      const run = buildRun({ commitSha: "abcdef1234567890" });
      const tag = executor.renderTag("myregistry.io/myapp:{{commitSha}}", run);
      expect(tag).toBe("myregistry.io/myapp:abcdef1");
    });

    it("should replace both placeholders in one template", () => {
      const run = buildRun({ version: "2.0.0", commitSha: "abc1234xyz" });
      const tag = executor.renderTag(
        "reg.io/app:{{version}}-{{commitSha}}",
        run,
      );
      expect(tag).toBe("reg.io/app:2.0.0-abc1234");
    });

    it("should default to 'latest' when version is not in metadata", () => {
      const run = buildRun({});
      const tag = executor.renderTag("reg.io/app:{{version}}", run);
      expect(tag).toBe("reg.io/app:latest");
    });

    it("should default to '0000000' when commitSha is not in metadata", () => {
      const run = buildRun({});
      const tag = executor.renderTag("reg.io/app:{{commitSha}}", run);
      expect(tag).toBe("reg.io/app:0000000");
    });
  });

  // ---------------------------------------------------------------------------
  // isEngineAvailable
  // ---------------------------------------------------------------------------
  describe("isEngineAvailable", () => {
    it("should return true when engine version command succeeds", async () => {
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, r: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "Docker version 24.0.0", stderr: "" }),
      );
      expect(await executor.isEngineAvailable("docker")).toBe(true);
    });

    it("should return false when engine binary is not found", async () => {
      mockExecImpl.mockImplementation(
        (_cmd: string, cb: (err: Error) => void) =>
          cb(new Error("command not found: docker")),
      );
      expect(await executor.isEngineAvailable("docker")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // execute
  // ---------------------------------------------------------------------------
  describe("execute", () => {
    it("should return success=false with descriptive message when engine is not available", async () => {
      mockExecImpl.mockImplementation(
        (_cmd: string, cb: (err: Error) => void) =>
          cb(new Error("command not found")),
      );

      const logs: string[] = [];
      const result = await executor.execute(
        buildStage(),
        buildRun({ version: "1.0.0", commitSha: "abc1234" }),
        (msg) => logs.push(msg),
      );

      expect(result.success).toBe(false);
      expect(result.output).toContain("build executor not available");
      expect(logs.some((l) => l.includes("not available"))).toBe(true);
    });

    it("should execute build command and return success=true on successful build", async () => {
      let callCount = 0;
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, r: { stdout: string; stderr: string }) => void,
        ) => {
          callCount++;
          cb(null, {
            stdout:
              callCount === 1 ? "Docker version 24.0.0" : "Build succeeded",
            stderr: "",
          });
        },
      );

      const logs: string[] = [];
      const result = await executor.execute(
        buildStage(),
        buildRun({ version: "1.0.0", commitSha: "abc1234" }),
        (msg) => logs.push(msg),
      );

      expect(result.success).toBe(true);
      expect(result.output).toContain("Build succeeded");
    });

    it("should execute push command when push=true", async () => {
      const capturedCmds: string[] = [];
      mockExecImpl.mockImplementation(
        (
          cmd: string,
          cb: (err: null, r: { stdout: string; stderr: string }) => void,
        ) => {
          capturedCmds.push(cmd);
          cb(null, { stdout: "ok", stderr: "" });
        },
      );

      await executor.execute(
        buildStage({ push: true }),
        buildRun({ version: "1.0.0", commitSha: "abc1234" }),
        jest.fn(),
      );

      expect(capturedCmds.some((c) => c.includes("push"))).toBe(true);
    });

    it("should use the specified engine (podman)", async () => {
      const capturedCmds: string[] = [];
      mockExecImpl.mockImplementation(
        (
          cmd: string,
          cb: (err: null, r: { stdout: string; stderr: string }) => void,
        ) => {
          capturedCmds.push(cmd);
          cb(null, { stdout: "ok", stderr: "" });
        },
      );

      await executor.execute(
        buildStage({ engine: "podman" }),
        buildRun({ version: "1.0.0", commitSha: "abc1234" }),
        jest.fn(),
      );

      expect(capturedCmds[0]).toContain("podman");
    });

    it("should return success=false when build command fails", async () => {
      let callCount = 0;
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (
            err: (Error & { stdout?: string; stderr?: string }) | null,
            r?: { stdout: string; stderr: string },
          ) => void,
        ) => {
          callCount++;
          if (callCount === 1) {
            cb(null, { stdout: "Docker version 24.0.0", stderr: "" });
          } else {
            const err = new Error("build failed") as Error & {
              stdout: string;
              stderr: string;
            };
            err.stdout = "";
            err.stderr = "Error: Dockerfile not found";
            cb(err);
          }
        },
      );

      const result = await executor.execute(
        buildStage(),
        buildRun({ version: "1.0.0", commitSha: "abc1234" }),
        jest.fn(),
      );

      expect(result.success).toBe(false);
      expect(result.output).toContain("Dockerfile not found");
    });
  });
});
