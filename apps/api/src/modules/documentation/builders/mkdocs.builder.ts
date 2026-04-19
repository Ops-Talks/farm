import { Logger } from "@nestjs/common";
import { execFile, spawn } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import { BuildResult, DocBuilder } from "./doc-builder.interface";
import { normalizeRef } from "./normalize-ref";

const execFileAsync = promisify(execFile);

/**
 * Documentation builder that invokes the MkDocs static-site generator.
 *
 * Enabled only when the MKDOCS_ENABLED environment variable is set to 'true'.
 * Detects support by checking for the presence of mkdocs.yml at the repository
 * root. On a successful build the site/ directory is returned as the artifacts
 * path; on failure the temporary directory is removed and a failed BuildResult
 * is returned.
 */
export class MkDocsBuilder implements DocBuilder {
  private readonly logger = new Logger(MkDocsBuilder.name);

  /**
   * Returns true only when MKDOCS_ENABLED=true and mkdocs.yml is present at
   * the repository root identified by repoPath.
   *
   * @param repoPath - Absolute path to the locally cloned repository
   */
  async supports(repoPath: string): Promise<boolean> {
    if (process.env.MKDOCS_ENABLED !== "true") {
      return false;
    }

    try {
      await fs.access(path.join(repoPath, "mkdocs.yml"));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shallow-clones the repository and runs `mkdocs build`. The site/
   * directory is returned as artifactsPath on success. On failure the
   * temporary directory is cleaned up before returning.
   *
   * @param componentId - Identifier of the component being built
   * @param repoUrl - Remote Git URL to clone
   * @param ref - Branch or tag name (full refs like refs/heads/main are normalized automatically)
   */
  async build(
    componentId: string,
    repoUrl: string,
    ref: string,
  ): Promise<BuildResult> {
    ref = normalizeRef(ref);
    const tmpDir = path.join(
      os.tmpdir(),
      `farm-mkdocs-${componentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const siteDir = path.join(tmpDir, "site");

    try {
      this.logger.log(
        `Cloning ${repoUrl} at ref ${ref} into ${tmpDir} for component ${componentId}`,
      );

      await execFileAsync("git", [
        "clone",
        "--depth",
        "1",
        "--branch",
        ref,
        repoUrl,
        tmpDir,
      ]);

      // Verify mkdocs.yml is present in the cloned repository.
      await fs.access(path.join(tmpDir, "mkdocs.yml"));

      const buildLog = await this.runMkDocs(tmpDir, siteDir, componentId);

      this.logger.log(`MkDocs build succeeded for component ${componentId}`);

      return { status: "ready", artifactsPath: siteDir, buildLog };
    } catch (err: unknown) {
      // err may be a structured failed-build object thrown from runMkDocs or
      // a plain Error from execFile / fs.access.
      if (
        err !== null &&
        typeof err === "object" &&
        "isMkDocsBuildFailure" in err
      ) {
        const failure = err as unknown as { buildLog: string };
        await fs.rm(tmpDir, { recursive: true, force: true });
        return { status: "failed", buildLog: failure.buildLog };
      }

      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `MkDocs build failed for component ${componentId}: ${message}`,
      );
      await fs.rm(tmpDir, { recursive: true, force: true });
      return { status: "failed", buildLog: message };
    }
  }

  /**
   * Runs `mkdocs build` via spawn and accumulates stdout/stderr into a single
   * log string. Resolves with the log on exit code 0; throws a structured
   * failure object on non-zero exit so the caller can distinguish a build
   * failure from an unexpected error.
   *
   * @param cwd - Working directory (the cloned repository root)
   * @param siteDir - Destination directory for the generated site
   * @param componentId - Used for log messages
   */
  private runMkDocs(
    cwd: string,
    siteDir: string,
    componentId: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];

      const proc = spawn("mkdocs", ["build", "--site-dir", siteDir], { cwd });

      proc.stdout.on("data", (data: Buffer) => {
        chunks.push(data.toString());
      });

      proc.stderr.on("data", (data: Buffer) => {
        chunks.push(data.toString());
      });

      proc.on("close", (code: number | null) => {
        const buildLog = chunks.join("");
        if (code === 0) {
          resolve(buildLog);
        } else {
          this.logger.warn(
            `mkdocs exited with code ${code} for component ${componentId}`,
          );
          const buildErr = Object.assign(new Error("mkdocs build failed"), {
            isMkDocsBuildFailure: true,
            buildLog,
          });
          reject(buildErr);
        }
      });

      proc.on("error", (err: Error) => {
        reject(err);
      });
    });
  }
}
