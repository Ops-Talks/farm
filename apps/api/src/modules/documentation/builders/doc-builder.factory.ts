import { execFile } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import { DocBuilder } from "./doc-builder.interface";
import { MarkdownBuilder } from "./markdown.builder";
import { MkDocsBuilder } from "./mkdocs.builder";

const execFileAsync = promisify(execFile);

/**
 * Factory that selects the most appropriate DocBuilder for a given repository.
 *
 * The list is ordered from most specific to most general. The first builder
 * whose supports() check returns true for the detection clone is returned.
 * MarkdownBuilder is always last and always matches, acting as the fallback.
 *
 * The detection clone is a separate shallow clone that is always cleaned up
 * after builder selection, independent of the build clone performed later.
 */
export class DocBuilderFactory {
  private static readonly builders: DocBuilder[] = [
    new MkDocsBuilder(),
    new MarkdownBuilder(), // always last — fallback
  ];

  /**
   * Resolves the best DocBuilder for the given repository by performing a
   * shallow detection clone, iterating through registered builders in
   * priority order, and cleaning up the detection clone afterwards.
   *
   * @param repoUrl - Remote Git URL of the repository to inspect
   * @param ref - Branch, tag, or commit ref to check out for detection
   * @returns The first matching DocBuilder, or MarkdownBuilder if none match
   */
  static async resolve(repoUrl: string, ref: string): Promise<DocBuilder> {
    const detectionDir = path.join(
      os.tmpdir(),
      `farm-detect-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    try {
      await execFileAsync("git", [
        "clone",
        "--depth",
        "1",
        "--branch",
        ref,
        repoUrl,
        detectionDir,
      ]);

      for (const builder of DocBuilderFactory.builders) {
        if (await builder.supports(detectionDir)) {
          return builder;
        }
      }
    } finally {
      await fs.rm(detectionDir, { recursive: true, force: true });
    }

    // Fallback: should not be reached because MarkdownBuilder always matches.
    return new MarkdownBuilder();
  }
}
