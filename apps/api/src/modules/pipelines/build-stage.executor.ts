import { Injectable, Logger } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import { PipelineStage } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";

const execFileAsync = promisify(execFile);

/**
 * Supported OCI build engines.
 */
type BuildEngine = "docker" | "buildah" | "podman";

const ALLOWED_ENGINES: BuildEngine[] = ["docker", "buildah", "podman"];

/**
 * Configuration for a build stage in a pipeline.
 * Matches stage.config when stage.type === 'build'.
 */
export interface BuildStageConfig {
  /** Executor engine identifier; defaults to "docker" */
  engine?: BuildEngine;
  /**
   * Image tag template. Supports {{version}} and {{commitSha}} placeholders.
   * Example: "myregistry.io/myapp:{{version}}-{{commitSha}}"
   */
  tag: string;
  /** Path to the Dockerfile (default "Dockerfile") */
  dockerfile?: string;
  /** Build context path (default ".") */
  context?: string;
  /** Whether to push the built image after building (default false) */
  push?: boolean;
}

/**
 * Result returned by BuildStageExecutor.execute().
 */
interface BuildStageResult {
  success: boolean;
  output: string;
}

/**
 * Metadata extracted from a pipeline run for template rendering.
 */
interface RunMetadata {
  version?: string;
  commitSha?: string;
}

/**
 * Executes an OCI image build stage using docker, buildah, or podman.
 * Supports template variable substitution in the image tag using
 * {{version}} and {{commitSha}} (short 7-char) placeholders.
 *
 * Gracefully degrades when the configured engine binary is not available
 * in PATH, returning a failed result with a descriptive message rather
 * than throwing an exception.
 */
@Injectable()
export class BuildStageExecutor {
  private readonly logger = new Logger(BuildStageExecutor.name);

  /**
   * Executes the build stage.
   *
   * @param stage - Pipeline stage definition containing BuildStageConfig
   * @param run - Current pipeline run (used for template variable resolution)
   * @param emitLog - Callback invoked with each log line as it is produced
   * @returns BuildStageResult with success flag and combined output
   */
  async execute(
    stage: PipelineStage,
    run: PipelineRun,
    emitLog: (msg: string) => void,
  ): Promise<BuildStageResult> {
    const config = stage.config as unknown as BuildStageConfig;
    const rawEngine = config.engine ?? "docker";
    if (!(ALLOWED_ENGINES as string[]).includes(rawEngine)) {
      const msg = `build executor rejected unknown engine "${rawEngine}"; falling back to "docker"`;
      this.logger.warn(msg);
      emitLog(msg);
    }
    const engine: BuildEngine = (ALLOWED_ENGINES as string[]).includes(
      rawEngine,
    )
      ? rawEngine
      : "docker";
    const dockerfile = config.dockerfile ?? "Dockerfile";
    const context = config.context ?? ".";
    const push = config.push ?? false;

    const available = await this.isEngineAvailable(engine);
    if (!available) {
      const msg = `build executor not available: ${engine} CLI not found in PATH`;
      this.logger.warn(msg);
      emitLog(msg);
      return { success: false, output: msg };
    }

    const renderedTag = this.renderTag(config.tag, run);
    // Build the argument list for execFile. Arguments are passed directly to
    // the OS without a shell, so no escaping is required or applied.
    const buildArgs = ["build", "-t", renderedTag, "-f", dockerfile, context];
    const buildCmd = [engine, ...buildArgs].join(" ");

    emitLog(`Executing: ${buildCmd}`);
    this.logger.log(`Build stage command: ${buildCmd}`);

    try {
      const buildResult = await execFileAsync(engine, buildArgs, {
        timeout: 10 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const buildOutput = [buildResult.stdout, buildResult.stderr]
        .filter(Boolean)
        .join("\n");
      buildOutput.split("\n").forEach((line) => line && emitLog(line));

      if (push) {
        // Push arguments are also passed directly to execFile (no shell).
        const pushArgs = ["push", renderedTag];
        const pushCmd = [engine, ...pushArgs].join(" ");
        emitLog(`Executing: ${pushCmd}`);
        this.logger.log(`Build push command: ${pushCmd}`);

        const pushResult = await execFileAsync(engine, pushArgs, {
          timeout: 5 * 60 * 1000,
          maxBuffer: 10 * 1024 * 1024,
        });
        const pushOutput = [pushResult.stdout, pushResult.stderr]
          .filter(Boolean)
          .join("\n");
        pushOutput.split("\n").forEach((line) => line && emitLog(line));

        const combinedOutput = [buildOutput, pushOutput]
          .filter(Boolean)
          .join("\n");
        this.logger.log(`Build and push succeeded for tag "${renderedTag}"`);
        return { success: true, output: combinedOutput };
      }

      this.logger.log(`Build succeeded for tag "${renderedTag}"`);
      return { success: true, output: buildOutput };
    } catch (err) {
      const error = err as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const output =
        [error.stdout, error.stderr, error.message]
          .filter(Boolean)
          .join("\n") || "unknown error";

      output.split("\n").forEach((line) => line && emitLog(line));
      this.logger.error(
        `Build stage failed for tag "${renderedTag}": ${output}`,
      );
      return { success: false, output };
    }
  }

  /**
   * Checks whether the specified engine binary is available in PATH.
   * Uses execFile (no shell) so the engine name is passed as a direct argument
   * and cannot introduce shell metacharacters. The allowlist provides an
   * additional layer of defence against unexpected values.
   *
   * @param engine - Engine name (docker, buildah, podman)
   * @returns true if the binary is accessible
   */
  async isEngineAvailable(engine: string): Promise<boolean> {
    if (!(ALLOWED_ENGINES as string[]).includes(engine)) {
      this.logger.warn(
        `isEngineAvailable: rejected unknown engine "${engine}"`,
      );
      return false;
    }

    const safeEngine = engine as BuildEngine;
    try {
      await execFileAsync(safeEngine, ["version"]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Renders the image tag template by substituting known placeholders.
   *
   * Supported placeholders:
   *   {{version}}   — replaced with run.metadata.version (or "latest")
   *   {{commitSha}} — replaced with first 7 chars of run.metadata.commitSha
   *
   * @param template - Tag template string
   * @param run - Pipeline run used for metadata extraction
   * @returns Rendered tag string
   */
  renderTag(template: string, run: PipelineRun): string {
    const meta = (run as unknown as { metadata?: RunMetadata }).metadata ?? {};
    const version = meta.version ?? "latest";
    const fullSha = meta.commitSha ?? "0000000";
    const commitSha = fullSha.slice(0, 7);

    return template
      .replace(/\{\{version\}\}/g, version)
      .replace(/\{\{commitSha\}\}/g, commitSha);
  }
}
