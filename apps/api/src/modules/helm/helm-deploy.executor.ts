import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Configuration for a Helm-based deploy stage in a pipeline.
 */
export interface HelmDeployConfig {
  /** Executor engine identifier; must equal "helm" to route to this executor */
  engine: "helm";
  /** Helm release name used with `helm upgrade --install` */
  releaseName: string;
  /** Chart reference, e.g. "bitnami/postgresql" or "./charts/myapp" */
  chart: string;
  /** Target Kubernetes namespace */
  namespace: string;
  /** Pinned chart version (passed as --version) */
  version?: string;
  /** URL or path to a values file (passed as -f) */
  valuesFile?: string;
  /** Additional --set key=value overrides */
  set?: Record<string, string>;
}

/**
 * Result returned by HelmDeployExecutor.execute().
 */
export interface HelmDeployResult {
  success: boolean;
  output: string;
}

/**
 * Executes a Helm deployment by running `helm upgrade --install` either
 * via the local `helm` CLI (if present in PATH) or gracefully degrading
 * when the binary is unavailable.
 *
 * Execution strategy (in priority order):
 *   1. Local `helm` CLI via child_process.exec
 *   2. Graceful degradation — returns { success: false, output: '<reason>' }
 *
 * The K8s Exec-into-pod strategy was intentionally omitted because it
 * requires a running helm-executor pod which is not guaranteed in all
 * environments. Operators that need in-cluster execution should pre-install
 * the helm CLI into the executor pod image and point KUBECONFIG accordingly.
 */
@Injectable()
export class HelmDeployExecutor {
  private readonly logger = new Logger(HelmDeployExecutor.name);

  /**
   * Executes `helm upgrade --install` with the provided configuration.
   *
   * @param config - HelmDeployConfig describing the release to deploy
   * @param emitLog - Callback invoked with each log line as it is produced
   * @returns HelmDeployResult with success flag and combined stdout/stderr output
   */
  async execute(
    config: HelmDeployConfig,
    emitLog: (msg: string) => void,
  ): Promise<HelmDeployResult> {
    const helmAvailable = await this.isHelmAvailable();

    if (!helmAvailable) {
      const msg =
        "helm executor not available: helm CLI not found in PATH and no in-cluster executor pod detected";
      this.logger.warn(msg);
      emitLog(msg);
      return { success: false, output: msg };
    }

    const command = this.buildCommand(config);
    emitLog(`Executing: ${command}`);
    this.logger.log(`Helm deploy command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 5 * 60 * 1000, // 5-minute hard cap
        maxBuffer: 10 * 1024 * 1024, // 10 MB output buffer
      });

      const output = [stdout, stderr].filter(Boolean).join("\n");
      output.split("\n").forEach((line) => line && emitLog(line));

      this.logger.log(
        `Helm deploy succeeded for release "${config.releaseName}"`,
      );
      return { success: true, output };
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
        `Helm deploy failed for release "${config.releaseName}": ${output}`,
      );
      return { success: false, output };
    }
  }

  /**
   * Checks whether the `helm` binary is available in the current PATH.
   * @returns true if `helm version` exits with code 0
   */
  async isHelmAvailable(): Promise<boolean> {
    try {
      await execAsync("helm version --short");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Constructs the helm upgrade --install command string from the provided config.
   *
   * @param config - HelmDeployConfig
   * @returns Full helm CLI command as a string
   */
  buildCommand(config: HelmDeployConfig): string {
    const parts: string[] = [
      "helm",
      "upgrade",
      "--install",
      this.shellEscape(config.releaseName),
      this.shellEscape(config.chart),
      "--namespace",
      this.shellEscape(config.namespace),
      "--create-namespace",
      "--wait",
      "--timeout",
      "4m0s",
    ];

    if (config.version) {
      parts.push("--version", this.shellEscape(config.version));
    }

    if (config.valuesFile) {
      parts.push("-f", this.shellEscape(config.valuesFile));
    }

    if (config.set) {
      for (const [key, value] of Object.entries(config.set)) {
        // Keys and values are shell-escaped individually.
        parts.push(
          "--set",
          `${this.shellEscape(key)}=${this.shellEscape(value)}`,
        );
      }
    }

    return parts.join(" ");
  }

  /**
   * Minimal shell-escaping for Helm CLI arguments.
   * Wraps the value in single quotes and escapes any embedded single quotes.
   *
   * @param value - The string to escape
   * @returns Shell-safe representation
   */
  private shellEscape(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
}
