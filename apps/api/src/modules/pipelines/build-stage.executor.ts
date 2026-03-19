import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import { PipelineStage } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";

const execAsync = promisify(exec);

/**
 * Supported OCI build engines.
 */
export type BuildEngine = "docker" | "buildah" | "podman";

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
export interface BuildStageResult {
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
    const engine: BuildEngine = config.engine ?? "docker";
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
    const buildCmd = `${engine} build -t ${this.shellEscape(renderedTag)} -f ${this.shellEscape(dockerfile)} ${this.shellEscape(context)}`;

    emitLog(`Executing: ${buildCmd}`);
    this.logger.log(`Build stage command: ${buildCmd}`);

    try {
      const buildResult = await execAsync(buildCmd, {
        timeout: 10 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const buildOutput = [buildResult.stdout, buildResult.stderr]
        .filter(Boolean)
        .join("\n");
      buildOutput.split("\n").forEach((line) => line && emitLog(line));

      if (push) {
        const pushCmd = `${engine} push ${this.shellEscape(renderedTag)}`;
        emitLog(`Executing: ${pushCmd}`);
        this.logger.log(`Build push command: ${pushCmd}`);

        const pushResult = await execAsync(pushCmd, {
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
   *
   * @param engine - Engine name (docker, buildah, podman)
   * @returns true if the binary is accessible
   */
  async isEngineAvailable(engine: string): Promise<boolean> {
    try {
      await execAsync(`${engine} version`);
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

  /**
   * Minimal shell-escaping for CLI arguments.
   * Wraps the value in single quotes and escapes embedded single quotes.
   *
   * @param value - The string to escape
   * @returns Shell-safe representation
   */
  private shellEscape(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
}
