import { Injectable, Logger, Optional } from "@nestjs/common";
import { GcpService } from "../gcp/gcp.service";

/**
 * Configuration for a Cloud Run deploy stage in a pipeline.
 */
export interface GcpCloudRunDeployConfig {
  /** Executor engine identifier; must equal "gcp-cloud-run" to route to this executor */
  engine: "gcp-cloud-run";
  /** Organization UUID used to resolve GCP credentials */
  orgId: string;
  /** Cloud Run service name */
  service: string;
  /** GCP region, e.g. "us-central1" */
  region: string;
  /** Container image URI to deploy */
  image: string;
  /** Optional GCP project ID override */
  projectId?: string;
}

/**
 * Pipeline stage executor for deploying to GCP Cloud Run.
 * Implements the execute(config, logFn) pattern used by pipeline processors.
 */
@Injectable()
export class GcpCloudRunExecutor {
  private readonly logger = new Logger(GcpCloudRunExecutor.name);

  constructor(@Optional() private readonly gcpService?: GcpService) {}

  /**
   * Executes a Cloud Run service deployment.
   *
   * @param config - Cloud Run deployment configuration
   * @param logFn - Callback invoked with each log line
   * @returns Execution result with success flag and output
   */
  async execute(
    config: GcpCloudRunDeployConfig,
    logFn: (msg: string) => void,
  ): Promise<{ success: boolean; output: string }> {
    if (!this.gcpService) {
      const msg = "GCP service not available — skipping Cloud Run deployment";
      this.logger.warn(msg);
      logFn(msg);
      return { success: false, output: msg };
    }

    logFn(
      `Deploying image "${config.image}" to Cloud Run service "${config.service}" in region "${config.region}"`,
    );
    this.logger.log(
      `Cloud Run deploy: service=${config.service} region=${config.region} image=${config.image}`,
    );

    const result = await this.gcpService.deployToCloudRun(config.orgId, {
      service: config.service,
      region: config.region,
      image: config.image,
      projectId: config.projectId,
    });

    logFn(result.output);
    return result;
  }
}
