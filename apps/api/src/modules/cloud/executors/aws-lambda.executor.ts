import { Injectable, Logger, Optional } from "@nestjs/common";
import { AwsService } from "../aws/aws.service";

/**
 * Configuration for a Lambda deploy stage in a pipeline.
 */
export interface AwsLambdaDeployConfig {
  /** Executor engine identifier; must equal "aws-lambda" to route to this executor */
  engine: "aws-lambda";
  /** Organization UUID used to resolve AWS credentials */
  orgId: string;
  /** Lambda function name or ARN */
  functionName: string;
  /** Container image URI (for image-based functions) */
  imageUri?: string;
  /** S3 bucket containing the deployment package */
  s3Bucket?: string;
  /** S3 key of the deployment package */
  s3Key?: string;
}

/**
 * Pipeline stage executor for deploying to AWS Lambda.
 * Implements the execute(config, logFn) pattern used by pipeline processors.
 */
@Injectable()
export class AwsLambdaExecutor {
  private readonly logger = new Logger(AwsLambdaExecutor.name);

  constructor(@Optional() private readonly awsService?: AwsService) {}

  /**
   * Executes a Lambda function code update.
   *
   * @param config - Lambda deployment configuration
   * @param logFn - Callback invoked with each log line
   * @returns Execution result with success flag and output
   */
  async execute(
    config: AwsLambdaDeployConfig,
    logFn: (msg: string) => void,
  ): Promise<{ success: boolean; output: string }> {
    if (!this.awsService) {
      const msg = "AWS service not available — skipping Lambda deployment";
      this.logger.warn(msg);
      logFn(msg);
      return { success: false, output: msg };
    }

    const target =
      config.imageUri ?? `s3://${config.s3Bucket ?? ""}/${config.s3Key ?? ""}`;
    logFn(`Deploying "${target}" to Lambda function "${config.functionName}"`);
    this.logger.log(
      `Lambda deploy: functionName=${config.functionName} imageUri=${config.imageUri ?? "n/a"} s3=${config.s3Bucket ?? ""}/${config.s3Key ?? ""}`,
    );

    const result = await this.awsService.deployToLambda(config.orgId, {
      functionName: config.functionName,
      imageUri: config.imageUri,
      s3Bucket: config.s3Bucket,
      s3Key: config.s3Key,
    });

    logFn(result.output);
    return result;
  }
}
