import { Logger } from "@nestjs/common";
import { execFile } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import { BuildResult, DocBuilder } from "./doc-builder.interface";
import { normalizeRef } from "./normalize-ref";

const execFileAsync = promisify(execFile);

/**
 * Fallback documentation builder that collects raw Markdown files.
 *
 * Supports every repository because Markdown is the lowest common denominator.
 * Gathers all .md files found directly under the repository root and under a
 * top-level docs/ directory (one level deep in each location).
 */
export class MarkdownBuilder implements DocBuilder {
  private readonly logger = new Logger(MarkdownBuilder.name);

  /**
   * Always returns true — MarkdownBuilder acts as the catch-all fallback.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supports(_: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Shallow-clones the repository, collects Markdown files, and returns a
   * BuildResult. The temporary clone directory is always removed in the
   * finally block regardless of outcome.
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
      `farm-md-${componentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

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

      const mdFiles: string[] = [];

      // Collect .md files at the repository root (one level deep).
      const rootEntries = await fs.readdir(tmpDir, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          mdFiles.push(path.join(tmpDir, entry.name));
        }
      }

      // Collect .md files under docs/ (one level deep).
      const docsDir = path.join(tmpDir, "docs");
      try {
        const docsEntries = await fs.readdir(docsDir, { withFileTypes: true });
        for (const entry of docsEntries) {
          if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
            mdFiles.push(path.join(docsDir, entry.name));
          }
        }
      } catch {
        // docs/ directory does not exist — that is acceptable.
      }

      this.logger.log(
        `Collected ${mdFiles.length} markdown files for component ${componentId}`,
      );

      return {
        status: "ready",
        artifactsPath: tmpDir,
        buildLog: `Collected ${mdFiles.length} markdown files`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Markdown build failed for component ${componentId}: ${message}`,
      );
      await fs.rm(tmpDir, { recursive: true, force: true });
      return { status: "failed", buildLog: message };
    }
  }
}
