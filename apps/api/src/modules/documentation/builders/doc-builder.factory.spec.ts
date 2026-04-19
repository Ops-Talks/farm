import { execFile } from "child_process";
import * as fs from "fs/promises";
import { DocBuilderFactory } from "./doc-builder.factory";
import { MarkdownBuilder } from "./markdown.builder";
import { MkDocsBuilder } from "./mkdocs.builder";

jest.mock("child_process");
jest.mock("fs/promises");

const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;
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

describe("DocBuilderFactory", () => {
  const originalEnv = process.env.MKDOCS_ENABLED;

  beforeEach(() => {
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

  /**
   * FARM-ST370: resolve() returns MkDocsBuilder when mkdocs.yml is present
   * and MKDOCS_ENABLED=true.
   */
  it("FARM-ST370: returns MkDocsBuilder when mkdocs.yml is present", async () => {
    process.env.MKDOCS_ENABLED = "true";
    mockExecFileSuccess();

    // fs.access resolves (mkdocs.yml exists), then rm resolves.
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.rm.mockResolvedValue(undefined);

    const builder = await DocBuilderFactory.resolve(
      "https://git.example.com/mkdocs-repo.git",
      "main",
    );

    expect(builder).toBeInstanceOf(MkDocsBuilder);
  });

  /**
   * FARM-ST371: resolve() returns MarkdownBuilder when no recognized build
   * configuration is found (MKDOCS_ENABLED not set, so MkDocs is skipped;
   * MarkdownBuilder always matches as fallback).
   */
  it("FARM-ST371: returns MarkdownBuilder when no recognized build config found", async () => {
    // MKDOCS_ENABLED not set — MkDocsBuilder.supports() returns false.
    mockExecFileSuccess();

    mockedFs.access.mockRejectedValue(new Error("ENOENT"));
    mockedFs.rm.mockResolvedValue(undefined);

    const builder = await DocBuilderFactory.resolve(
      "https://git.example.com/plain-repo.git",
      "main",
    );

    expect(builder).toBeInstanceOf(MarkdownBuilder);
  });

  it("always cleans up the detection clone directory", async () => {
    mockExecFileSuccess();
    mockedFs.access.mockRejectedValue(new Error("ENOENT"));
    mockedFs.rm.mockResolvedValue(undefined);

    await DocBuilderFactory.resolve("https://git.example.com/repo.git", "main");

    expect(mockedFs.rm).toHaveBeenCalledWith(
      expect.stringContaining("farm-detect-"),
      { recursive: true, force: true },
    );
  });

  it("still cleans up the detection clone directory and rejects when git clone throws", async () => {
    // When execFile rejects (e.g. network error) there is no catch in resolve(),
    // so the exception propagates to the caller. The finally block must still
    // run and remove the detection directory.
    mockedExecFile.mockImplementation(
      (_cmd: unknown, _args: unknown, callback: unknown) => {
        (callback as (err: Error) => void)(new Error("network unreachable"));
        return {} as ReturnType<typeof execFile>;
      },
    );
    mockedFs.rm.mockResolvedValue(undefined);

    await expect(
      DocBuilderFactory.resolve("https://git.example.com/repo.git", "main"),
    ).rejects.toThrow("network unreachable");

    expect(mockedFs.rm).toHaveBeenCalledWith(
      expect.stringContaining("farm-detect-"),
      { recursive: true, force: true },
    );
  });

  it("returns a MarkdownBuilder instance from the line-64 fallback when no builder claims support", async () => {
    // This exercises the dead-code guard at line 64 of doc-builder.factory.ts.
    // Both registered builders are forced to return false from supports() so
    // that the selection loop exits without returning, and the final fallback
    // statement is reached.
    mockExecFileSuccess();
    mockedFs.rm.mockResolvedValue(undefined);

    const mkdocsSpy = jest
      .spyOn(MkDocsBuilder.prototype, "supports")
      .mockResolvedValueOnce(false);
    const markdownSpy = jest
      .spyOn(MarkdownBuilder.prototype, "supports")
      .mockResolvedValueOnce(false);

    const builder = await DocBuilderFactory.resolve(
      "https://git.example.com/repo.git",
      "main",
    );

    mkdocsSpy.mockRestore();
    markdownSpy.mockRestore();

    expect(builder).toBeInstanceOf(MarkdownBuilder);
  });
});
