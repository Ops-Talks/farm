import { Test, TestingModule } from "@nestjs/testing";
import { HelmDeployExecutor, HelmDeployConfig } from "./helm-deploy.executor";

// ---------------------------------------------------------------------------
// Mock child_process so no real shell is ever invoked.
// exec  → used only by isHelmAvailable (hardcoded "helm version --short").
// execFile → used by execute() for the actual helm upgrade --install call.
// ---------------------------------------------------------------------------
const mockExecImpl = jest.fn();
const mockExecFileImpl = jest.fn();

jest.mock("child_process", () => ({
  exec: (cmd: string, optsOrCb: unknown, maybeCb?: unknown) => {
    // promisify passes: exec(cmd, options, callback) when options are present,
    // or exec(cmd, callback) when only the command is provided.
    const cb = typeof maybeCb === "function" ? maybeCb : optsOrCb;
    mockExecImpl(cmd, cb);
  },
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
    mockExecFileImpl.mockReset();

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
      const args = executor.buildCommand(baseConfig);
      expect(args).toContain("upgrade");
      expect(args).toContain("--install");
      expect(args).toContain("--namespace");
      expect(args).toContain("--create-namespace");
    });

    it("should include --version flag when version is provided", () => {
      const args = executor.buildCommand({ ...baseConfig, version: "12.1.0" });
      expect(args).toContain("--version");
      expect(args).toContain("12.1.0");
    });

    it("should include -f flag when valuesFile is provided", () => {
      const args = executor.buildCommand({
        ...baseConfig,
        valuesFile: "values/production.yaml",
      });
      expect(args).toContain("-f");
      expect(args).toContain("values/production.yaml");
    });

    it("should include --set flags for each key-value pair", () => {
      const args = executor.buildCommand({
        ...baseConfig,
        set: { image: "myapp:1.0", replicas: "3" },
      });
      expect(args).toContain("--set");
      // key and value are combined as a single "key=value" argument.
      expect(args).toContain("image=myapp:1.0");
      expect(args).toContain("replicas=3");
    });

    it("should pass values with spaces as raw strings (no shell escaping needed)", () => {
      const args = executor.buildCommand({
        ...baseConfig,
        releaseName: "my release",
      });
      // With execFile there is no shell, so values are passed verbatim.
      expect(args).toContain("my release");
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
      // helm version (isHelmAvailable) fails → not available.
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
      // execFile must never be reached when helm is unavailable.
      expect(mockExecFileImpl).not.toHaveBeenCalled();
    });

    it("should return success=true and captured output on successful deployment", async () => {
      // isHelmAvailable (exec) succeeds.
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "v3.12.0", stderr: "" }),
      );
      // helm upgrade --install (execFile) succeeds.
      mockExecFileImpl.mockImplementation(
        (
          _file: string,
          _args: string[],
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "Release deployed successfully", stderr: "" }),
      );

      const logs: string[] = [];
      const result = await executor.execute(baseConfig, (msg) =>
        logs.push(msg),
      );

      expect(result.success).toBe(true);
      expect(result.output).toContain("Release deployed successfully");
    });

    it("should return success=false and captured stderr when helm command fails", async () => {
      // isHelmAvailable (exec) succeeds.
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "v3.12.0", stderr: "" }),
      );
      // helm upgrade --install (execFile) fails.
      mockExecFileImpl.mockImplementation(
        (
          _file: string,
          _args: string[],
          cb: (
            err: Error & { stdout?: string; stderr?: string },
          ) => void,
        ) => {
          const helmError = Object.assign(new Error("helm error"), {
            stdout: "",
            stderr: "Error: chart not found",
          });
          cb(helmError);
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
      // isHelmAvailable (exec) succeeds.
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "v3.12.0", stderr: "" }),
      );
      let capturedFile = "";
      let capturedArgs: string[] = [];
      mockExecFileImpl.mockImplementation(
        (
          file: string,
          args: string[],
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => {
          capturedFile = file;
          capturedArgs = args;
          cb(null, { stdout: "", stderr: "" });
        },
      );

      const configWithSet: HelmDeployConfig = {
        ...baseConfig,
        set: { "image.tag": "1.0.0" },
      };

      await executor.execute(configWithSet, jest.fn());

      expect(capturedFile).toBe("helm");
      expect(capturedArgs).toContain("--set");
      expect(capturedArgs).toContain("image.tag=1.0.0");
    });

    it("should pass shell-metacharacter values as literal arguments without shell interpretation", async () => {
      // isHelmAvailable (exec) succeeds.
      mockExecImpl.mockImplementation(
        (
          _cmd: string,
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => cb(null, { stdout: "v3.12.0", stderr: "" }),
      );
      let capturedFile = "";
      let capturedArgs: string[] = [];
      mockExecFileImpl.mockImplementation(
        (
          file: string,
          args: string[],
          cb: (err: null, result: { stdout: string; stderr: string }) => void,
        ) => {
          capturedFile = file;
          capturedArgs = args;
          cb(null, { stdout: "", stderr: "" });
        },
      );

      // Simulate a user-supplied config value that contains shell metacharacters.
      const maliciousConfig: HelmDeployConfig = {
        ...baseConfig,
        releaseName: "evil; rm -rf /",
      };

      await executor.execute(maliciousConfig, jest.fn());

      // execFile is invoked with "helm" as the binary; the malicious string is
      // passed as a plain argument element and is never interpreted by a shell.
      expect(capturedFile).toBe("helm");
      expect(capturedArgs).toContain("evil; rm -rf /");
    });
  });
});
