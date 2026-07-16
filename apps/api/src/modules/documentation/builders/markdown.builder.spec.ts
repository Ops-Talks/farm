jest.mock("child_process", () => ({
  execFile: jest.fn(),
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
import { execFile } from "child_process";
import * as fs from "fs/promises";
import { MarkdownBuilder } from "./markdown.builder";

const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;
const mockedFs = fs as jest.Mocked<typeof fs>;

/**
 * Builds a promisified execFile mock that either resolves or rejects.
 * execFile uses a callback; promisify wraps it, so we simulate via the
 * callback parameter that promisify passes as the last argument.
 */
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

function mockExecFileFailure(message: string): void {
  mockedExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, callback: unknown) => {
      (callback as (err: Error) => void)(new Error(message));
      return {} as ReturnType<typeof execFile>;
    },
  );
}

describe("MarkdownBuilder", () => {
  let builder: MarkdownBuilder;

  beforeEach(() => {
    builder = new MarkdownBuilder();
    jest.clearAllMocks();
  });

  describe("supports()", () => {
    it("always returns true regardless of repoPath", async () => {
      const result = await builder.supports("/any/path");
      expect(result).toBe(true);
    });
  });

  describe("build()", () => {
    it("resolves with status ready when git clone succeeds and finds md files", async () => {
      mockExecFileSuccess();

      // Root directory contains one .md file and one non-md file.
      mockedFs.readdir
        .mockResolvedValueOnce([
          { isFile: () => true, name: "README.md" },
          { isFile: () => true, name: "index.ts" },
        ] as unknown)
        // docs/ directory contains one .md file.
        .mockResolvedValueOnce([
          { isFile: () => true, name: "guide.md" },
        ] as unknown);

      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-1",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("ready");
      expect(result.artifactsPath).toBeDefined();
      expect(result.buildLog).toBe("Collected 2 markdown files");
    });

    it("resolves with status ready and zero files when no md files found", async () => {
      mockExecFileSuccess();

      mockedFs.readdir.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-2",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("ready");
      expect(result.buildLog).toBe("Collected 0 markdown files");
    });

    it("resolves with status failed when git clone throws", async () => {
      mockExecFileFailure("repository not found");

      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-3",
        "https://git.example.com/bad.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toBe("repository not found");
    });

    it("does not clean up tmpDir on success so artifacts remain accessible", async () => {
      mockExecFileSuccess();

      mockedFs.readdir.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockedFs.rm.mockResolvedValue(undefined);

      await builder.build("comp-4", "https://git.example.com/repo.git", "main");

      expect(mockedFs.rm).not.toHaveBeenCalled();
    });

    it("cleans up tmpDir via fs.rm in the catch block on failure", async () => {
      mockExecFileFailure("clone error");
      mockedFs.rm.mockResolvedValue(undefined);

      await builder.build("comp-5", "https://git.example.com/repo.git", "main");

      expect(mockedFs.rm).toHaveBeenCalledWith(
        expect.stringContaining("farm-md-comp-5"),
        { recursive: true, force: true },
      );
    });

    it("resolves with status failed when root fs.readdir throws after a successful clone", async () => {
      // Clone succeeds but reading the cloned directory fails immediately.
      // This exercises the outer catch block via a path distinct from clone failure.
      mockExecFileSuccess();
      mockedFs.readdir.mockRejectedValueOnce(
        new Error("EACCES: permission denied, scandir '/mnt/repo'"),
      );
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-6",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toBe(
        "EACCES: permission denied, scandir '/mnt/repo'",
      );
      expect(mockedFs.rm).toHaveBeenCalledWith(
        expect.stringContaining("farm-md-comp-6"),
        { recursive: true, force: true },
      );
    });

    it("skips non-file and non-.md entries inside docs/ directory", async () => {
      // The docs/ readdir returns a sub-directory entry (isFile false) and a
      // non-markdown file. Neither should be counted. This covers the falsy
      // branch of the `entry.isFile() && entry.name.endsWith(".md")` guard
      // on line 77 of markdown.builder.ts.
      mockExecFileSuccess();

      mockedFs.readdir.mockResolvedValueOnce([]).mockResolvedValueOnce([
        { isFile: () => false, name: "images" },
        { isFile: () => true, name: "diagram.png" },
        { isFile: () => true, name: "guide.md" },
      ] as unknown);

      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-7",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("ready");
      expect(result.buildLog).toBe("Collected 1 markdown files");
    });

    it("resolves with status failed and uses String() when a non-Error value is thrown", async () => {
      // Rejecting with a plain string (not an Error instance) exercises the
      // `String(err)` arm of the ternary on line 95 of markdown.builder.ts.
      mockExecFileSuccess();
      mockedFs.readdir.mockRejectedValueOnce("disk full");
      mockedFs.rm.mockResolvedValue(undefined);

      const result = await builder.build(
        "comp-8",
        "https://git.example.com/repo.git",
        "main",
      );

      expect(result.status).toBe("failed");
      expect(result.buildLog).toBe("disk full");
    });
  });
});
