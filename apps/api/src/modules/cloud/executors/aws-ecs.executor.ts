import { Injectable, Logger, Optional } from "@nestjs/common";
import { AwsService } from "../aws/aws.service";

/**
 * Configuration for an ECS deploy stage in a pipeline.
 */
export interface AwsEcsDeployConfig {
  /** Executor engine identifier; must equal "aws-ecs" to route to this executor */
  engine: "aws-ecs";
  /** Organization UUID used to resolve AWS credentials */
  orgId: string;
  /** ECS cluster name or ARN */
  cluster: string;
  /** ECS service name */
  service: string;
  /** Container image URI to deploy */
  image: string;
}

/**
 * Pipeline stage executor for deploying to AWS ECS.
 * Implements the execute(config, logFn) pattern used by pipeline processors.
 */
@Injectable()
export class AwsEcsExecutor {
  private readonly logger = new Logger(AwsEcsExecutor.name);

  constructor(@Optional() private readonly awsService?: AwsService) {}

  /**
   * Executes an ECS deployment.
   *
   * @param config - ECS deployment configuration
   * @param logFn - Callback invoked with each log line
   * @returns Execution result with success flag and output
   */
  async execute(
    config: AwsEcsDeployConfig,
    logFn: (msg: string) => void,
  ): Promise<{ success: boolean; output: string }> {
    if (!this.awsService) {
      const msg = "AWS service not available — skipping ECS deployment";
      this.logger.warn(msg);
      logFn(msg);
      return { success: false, output: msg };
    }

    logFn(
      `Deploying image "${config.image}" to ECS service "${config.service}" in cluster "${config.cluster}"`,
    );
    this.logger.log(
      `ECS deploy: cluster=${config.cluster} service=${config.service} image=${config.image}`,
    );

    const result = await this.awsService.deployToEcs(config.orgId, {
      cluster: config.cluster,
      service: config.service,
      image: config.image,
    });

    logFn(result.output);
    return result;
  }
}
