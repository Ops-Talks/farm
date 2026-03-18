import { Test, TestingModule } from "@nestjs/testing";
import { HelmDeployExecutor, HelmDeployConfig } from "./helm-deploy.executor";

// ---------------------------------------------------------------------------
// Mock child_process so no real shell is ever invoked.
// The mock captures the callback-style exec call and allows per-test control.
// ---------------------------------------------------------------------------
const mockExecImpl = jest.fn();

jest.mock("child_process", () => ({
  exec: (cmd: string, optsOrCb: unknown, maybeCb?: unknown) => {
    // promisify passes: exec(cmd, options, callback) when options are present,
    // or exec(cmd, callback) when only the command is provided.
    const cb = typeof maybeCb === "function" ? maybeCb : optsOrCb;
    mockExecImpl(cmd, cb);
  },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseConfig: HelmDeployConfig = {
  engine: "helm",
  releaseName: "my-release",
  chart: "bitnami/postgresql",
  namespace: "production",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HelmDeployExecutor", () => {
  let executor: HelmDeployExecutor;

  beforeEach(async () => {
    mockExecImpl.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HelmDeployExecutor],
    }).compile();

    executor = module.get<HelmDeployExecutor>(HelmDeployExecutor);
  });

  it("should be defined", () => {
    expect(executor).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // buildCommand
  // -------------------------------------------------------------------------
  describe("buildCommand", () => {
    it("should include basic upgrade --install flags", () => {
      const cmd = executor.buildCommand(baseConfig);
      expect(cmd).toContain("helm upgrade --install");
      expect(cmd).toContain("--namespace");
      expect(cmd).toContain("--create-namespace");
    });

    it("should include --version flag when version is provided", () => {
      const cmd = executor.buildCommand({ ...baseConfig, version: "12.1.0" });
      expect(cmd).toContain("--version");
      expect(cmd).toContain("12.1.0");
    });

    it("should include -f flag when valuesFile is provided", () => {
      const cmd = executor.buildCommand({
        ...baseConfig,
        valuesFile: "values/production.yaml",
      });
      expect(cmd).toContain("-f");
      expect(cmd).toContain("values/production.yaml");
    });

    it("should include --set flags for each key-value pair", () => {
      const cmd = executor.buildCommand({
        ...baseConfig,
        set: { image: "myapp:1.0", replicas: "3" },
      });
      expect(cmd).toContain("--set");
      expect(cmd).toContain("image");
      expect(cmd).toContain("myapp:1.0");
    });

    it("should shell-escape values containing spaces", () => {
      const cmd = executor.buildCommand({
        ...baseConfig,
        releaseName: "my release",
      });
      // The release name is wrapped in single quotes.
      expect(cmd).toContain("'my release'");
    });
  });

  // -------------------------------------------------------------------------
  // isHelmAvailable
  // -------------------------------------------------------------------------
  describe("isHelmAvailable", () => {
    it("should return true when helm version --short exits with code 0", async () => {
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "v3.12.0", stderr: "" }),
      );
      const available = await executor.isHelmAvailable();
      expect(available).toBe(true);
    });

    it("should return false when helm binary is not found", async () => {
      mockExecImpl.mockImplementation(
        (_cmd: string, cb: (err: Error) => void) =>
          cb(new Error("command not found: helm")),
      );
      const available = await executor.isHelmAvailable();
      expect(available).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // execute
  // -------------------------------------------------------------------------
  describe("execute", () => {
    it("should return success=false with descriptive message when helm is not available", async () => {
      // helm version fails → not available.
      mockExecImpl.mockImplementation(
        (_cmd: string, cb: (err: Error) => void) =>
          cb(new Error("command not found")),
      );

      const logs: string[] = [];
      const result = await executor.execute(baseConfig, (msg) =>
        logs.push(msg),
      );

      expect(result.success).toBe(false);
      expect(result.output).toContain("helm executor not available");
      expect(logs.some((l) => l.includes("not available"))).toBe(true);
    });

    it("should return success=true and captured output on successful deployment", async () => {
      let callCount = 0;
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => {
          callCount++;
          // First call: helm version check.
          // Second call: helm upgrade --install.
          cb(null, {
            stdout:
              callCount === 1 ? "v3.12.0" : "Release deployed successfully",
            stderr: "",
          });
        },
      );

      const logs: string[] = [];
      const result = await executor.execute(baseConfig, (msg) =>
        logs.push(msg),
      );

      expect(result.success).toBe(true);
      expect(result.output).toContain("Release deployed successfully");
    });

    it("should return success=false and captured stderr when helm command fails", async () => {
      let callCount = 0;
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (
            err: (Error & { stdout?: string; stderr?: string }) | null,
            result?: { stdout: string; stderr: string },
          ) => void,
        ) => {
          callCount++;
          if (callCount === 1) {
            // helm version succeeds.
            cb(null, { stdout: "v3.12.0", stderr: "" });
          } else {
            // helm upgrade --install fails.
            const helmError = new Error("helm error") as Error & {
              stdout: string;
              stderr: string;
            };
            helmError.stdout = "";
            helmError.stderr = "Error: chart not found";
            cb(helmError);
          }
        },
      );

      const logs: string[] = [];
      const result = await executor.execute(baseConfig, (msg) =>
        logs.push(msg),
      );

      expect(result.success).toBe(false);
      expect(result.output).toContain("chart not found");
    });

    it("should include all set overrides in the executed command", async () => {
      let capturedCmd = "";
      mockExecImpl.mockImplementation(
        (
          cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => {
          capturedCmd = cmd;
          cb(null, { stdout: "", stderr: "" });
        },
      );

      const configWithSet: HelmDeployConfig = {
        ...baseConfig,
        set: { "image.tag": "1.0.0" },
      };

      await executor.execute(configWithSet, jest.fn());

      // The second call (upgrade --install) should include --set.
      expect(capturedCmd).toContain("--set");
    });
  });
});
