import { Injectable, Logger } from "@nestjs/common";
import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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
 *   1. Local `helm` CLI via child_process.execFile (no shell spawned)
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

    // buildCommand returns the args array (without "helm"); execFile passes
    // each element directly to the OS without invoking a shell, which
    // eliminates the risk of shell injection from user-supplied config values.
    const args = this.buildCommand(config);
    const displayCmd = ["helm", ...args].join(" ");
    emitLog(`Executing: ${displayCmd}`);
    this.logger.log(`Helm deploy command: ${displayCmd}`);

    try {
      const { stdout, stderr } = await execFileAsync("helm", args, {
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
   * Constructs the helm upgrade --install argument list from the provided
   * config.  The returned array is intended to be passed directly to
   * execFile("helm", args) — no shell is spawned, so no shell escaping is
   * applied or required.
   *
   * @param config - HelmDeployConfig
   * @returns Argument array for execFile (does not include the "helm" binary)
   */
  buildCommand(config: HelmDeployConfig): string[] {
    const args: string[] = [
      "upgrade",
      "--install",
      config.releaseName,
      config.chart,
      "--namespace",
      config.namespace,
      "--create-namespace",
      "--wait",
      "--timeout",
      "4m0s",
    ];

    if (config.version) {
      args.push("--version", config.version);
    }

    if (config.valuesFile) {
      args.push("-f", config.valuesFile);
    }

    if (config.set) {
      for (const [key, value] of Object.entries(config.set)) {
        // key=value is passed as a single argument; helm parses it internally.
        args.push("--set", `${key}=${value}`);
      }
    }

    return args;
  }
}
