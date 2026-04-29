jest.mock("child_process", () => ({
  execFile: jest.fn(),
  spawn: jest.fn(),
}));
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
  rm: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
  mkdtemp: jest.fn(),
  writeFile: jest.fn(),
}));
import { execFile, spawn } from "child_process";
import * as fs from "fs/promises";
import { EventEmitter } from "events";
import { MkDocsBuilder } from "./mkdocs.builder";

const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockedFs = fs as jest.Mocked<typeof fs>;

function mockExecFileSuccess(): void {
  mockedExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, callback: unknown) => {
      (
        callback as (
          err: null,
          result: { stdout: string; stderr: string },
        ) => void
      )(null, { stdout: "", stderr: "" });
      return {} as ReturnType<typeof execFile>;
    },
  );
}

/**
 * Creates a fake child process that emits stdout/stderr data and then fires
 * the close event with the specified exit code.
 */
function makeFakeProc(exitCode: number, stdoutData = "", stderrData = "") {
  const proc = new EventEmitter() as ReturnType<typeof spawn>;

  // Attach writable-stream-like stdout and stderr emitters.
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  (proc as unknown as Record<string, unknown>).stdout = stdout;
  (proc as unknown as Record<string, unknown>).stderr = stderr;

  // Emit data and close asynchronously so promise handlers are wired first.
  setImmediate(() => {
    if (stdoutData) stdout.emit("data", Buffer.from(stdoutData));
    if (stderrData) stderr.emit("data", Buffer.from(stderrData));
    proc.emit("close", exitCode);
  });

  return proc;
}

describe("MkDocsBuilder", () => {
  let builder: MkDocsBuilder;
  const originalEnv = process.env.MKDOCS_ENABLED;

  beforeEach(() => {
    builder = new MkDocsBuilder();
    jest.clearAllMocks();
    delete process.env.MKDOCS_ENABLED;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.MKDOCS_ENABLED = originalEnv;
    } else {
      delete process.env.MKDOCS_ENABLED;
    }
  });

  describe("supports()", () => {
    it("returns false when MKDOCS_ENABLED is not set", async () => {
      const result = await builder.supports("/some/repo");
      expect(result).toBe(false);
    });

    it("returns false when MKDOCS_ENABLED is set to a value other than true", async () => {
      process.env.MKDOCS_ENABLED = "1";
      const result = await builder.supports("/some/repo");
      expect(result).toBe(false);
    });

    it("returns true when MKDOCS_ENABLED=true and mkdocs.yml exists", async () => {
      process.env.MKDOCS_ENABLED = "true";
      mockedFs.access.mockResolvedValue(undefined);

      const result = await builder.supports("/some/repo");

      expect(result).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith("/some/repo/mkdocs.yml");
    });

    it("returns false when MKDOCS_ENABLED=true but mkdocs.yml is missing", async () => {
      process.env.MKDOCS_ENABLED = "true";
      mockedFs.access.mockRejectedValue(new Error("ENOENT"));

      const result = await builder.supports("/some/repo");

      expect(result).toBe(false);
    });
  });

  describe("build()", () => {
    it("resolves with status ready when mkdocs exits with code 0", async () => {
      mockExecFileSuccess();
      // mkdocs.yml exists in the cloned repo.
      mockedFs.access.mockResolvedValue(undefined);
      mockedSpawn.mockReturnValue(
        makeFakeProc(0, "INFO - Documentation built", ""),
      );
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-1",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("ready");
      expect(result.artifactsPath).toContain("site");
      expect(result.buildLog).toContain("INFO - Documentation built");
    });

    it("resolves with status failed when mkdocs exits with non-zero code", async () => {
      mockExecFileSuccess();
      mockedFs.access.mockResolvedValue(undefined);
      mockedSpawn.mockReturnValue(
        makeFakeProc(1, "", "ERROR - Config file not found"),
      );
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-2",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toContain("ERROR - Config file not found");
    });

    it("resolves with status failed when git clone throws", async () => {
      mockedExecFile.mockImplementation(
        (_cmd: unknown, _args: unknown, callback: unknown) => {
          (callback as (err: Error) => void)(new Error("clone failed"));
          return {} as ReturnType<typeof execFile>;
        },
      );
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-3",
        "https://git.example.com/bad.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toBe("clone failed");
    });

    it("resolves with status failed when mkdocs.yml is absent in the clone", async () => {
      mockExecFileSuccess();
      mockedFs.access.mockRejectedValue(
        new Error("ENOENT: mkdocs.yml not found"),
      );
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-4",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("failed");
    });

    it("cleans up tmpDir on failure", async () => {
      mockExecFileSuccess();
      mockedFs.access.mockResolvedValue(undefined);
      mockedSpawn.mockReturnValue(makeFakeProc(2, "", "build error"));
      mockedFs.rm.mockResolvedValue(undefined);

      await builder.build("comp-5", "https://git.example.com/repo.git", "main");

      expect(mockedFs.rm).toHaveBeenCalledWith(
        expect.stringContaining("farm-mkdocs-comp-5"),
        { recursive: true, force: true },
      );
    });

    it("resolves with status failed when the spawn process emits an error event", async () => {
      // An `error` event fired by spawn (e.g. mkdocs binary not found) must
      // reject runMkDocs(), be caught by the outer handler, and propagate as a
      // failed BuildResult. This exercises the proc.on("error") listener on
      // line 150 of mkdocs.builder.ts.
      mockExecFileSuccess();
      mockedFs.access.mockResolvedValue(undefined);

      const proc = new EventEmitter() as ReturnType<typeof spawn>;
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      setImmediate(() => {
        proc.emit("error", new Error("mkdocs: command not found"));
      });
      mockedSpawn.mockReturnValue(proc);
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-6",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toBe("mkdocs: command not found");
      expect(mockedFs.rm).toHaveBeenCalledWith(
        expect.stringContaining("farm-mkdocs-comp-6"),
        { recursive: true, force: true },
      );
    });

    it("resolves with status failed and uses String() when a non-Error value is thrown", async () => {
      // When the caught value is not an Error instance (e.g. a plain string
      // rejection from fs.access), the catch block must fall through to the
      // String(err) arm on line 100 of mkdocs.builder.ts rather than
      // err.message.
      mockExecFileSuccess();
      mockedFs.access.mockRejectedValueOnce("ENOENT as plain string");
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-7",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toBe("ENOENT as plain string");
    });
  });
});
