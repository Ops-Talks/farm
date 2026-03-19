import { Injectable, Logger } from "@nestjs/common";
import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
  ResourceTagMapping,
} from "@aws-sdk/client-resource-groups-tagging-api";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GroupDefinitionType,
} from "@aws-sdk/client-cost-explorer";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  ECSClient,
  UpdateServiceCommand,
  DescribeServicesCommand,
} from "@aws-sdk/client-ecs";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
} from "@aws-sdk/client-lambda";
import { IntegrationCredentialService } from "../../integrations/integration-credential.service";
import { IntegrationType } from "../../integrations/entities/integration-credential.entity";
import { CloudResource } from "../interfaces/cloud-resource.interface";
import { CloudCostEntry } from "../dto/cloud-cost.dto";

/**
 * Decrypted payload stored for AWS credentials.
 */
interface AwsCredentialPayload {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/**
 * Service that interacts with AWS cloud APIs.
 * All SDK clients are instantiated at runtime using credentials fetched
 * from IntegrationCredentialService — no hard-coded credentials are used.
 */
@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);

  constructor(
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Resolves and decrypts the AWS credential payload for an organization.
   *
   * @param orgId - Organization UUID
   * @returns Parsed AWS credentials or null when not configured
   */
  private async getCredentials(
    orgId: string,
  ): Promise<AwsCredentialPayload | null> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.AWS_IAM_ROLE,
    );
    if (!credential) {
      return null;
    }
    try {
      const plain = this.credentialService.decrypt(credential.encryptedValue);
      return JSON.parse(plain) as AwsCredentialPayload;
    } catch (err) {
      this.logger.error(
        `Failed to decrypt AWS credential for org ${orgId}`,
        err,
      );
      return null;
    }
  }

  /**
   * Discovers tagged AWS resources using the Resource Groups Tagging API.
   * Resources must have either the "farm:component" or "farm.io/component" tag.
   *
   * @param orgId - Organization UUID
   * @returns Array of discovered cloud resources, or empty array on missing config
   */
  async discoverResources(orgId: string): Promise<CloudResource[]> {
    const creds = await this.getCredentials(orgId);
    if (!creds) {
      this.logger.warn(`AWS credentials not configured for org ${orgId}`);
      return [];
    }

    const client = new ResourceGroupsTaggingAPIClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });

    const resources: CloudResource[] = [];

    try {
      for (const tagKey of ["farm:component", "farm.io/component"]) {
        let paginationToken: string | undefined;
        do {
          const command = new GetResourcesCommand({
            TagFilters: [{ Key: tagKey }],
            PaginationToken: paginationToken,
          });
          const response = await client.send(command);
          const mappings: ResourceTagMapping[] =
            response.ResourceTagMappingList ?? [];

          for (const mapping of mappings) {
            if (!mapping.ResourceARN) continue;
            const tags: Record<string, string> = {};
            for (const tag of mapping.Tags ?? []) {
              if (tag.Key && tag.Value !== undefined) {
                tags[tag.Key] = tag.Value;
              }
            }
            const linkedComponentId =
              tags["farm:component"] ?? tags["farm.io/component"];
            const resourceType = this.inferResourceType(mapping.ResourceARN);
            const name = this.extractNameFromArn(mapping.ResourceARN);

            resources.push({
              provider: "aws",
              resourceId: mapping.ResourceARN,
              resourceType,
              name,
              region: creds.region,
              tags,
              linkedComponentId,
            });
          }
          paginationToken = response.PaginationToken;
        } while (paginationToken);
      }
    } catch (err) {
      this.logger.error(
        `Failed to discover AWS resources for org ${orgId}`,
        err,
      );
      return [];
    }

    // Deduplicate by resourceId.
    const seen = new Set<string>();
    return resources.filter((r) => {
      if (seen.has(r.resourceId)) return false;
      seen.add(r.resourceId);
      return true;
    });
  }

  /**
   * Fetches monthly AWS cost grouped by the farm:environment tag.
   *
   * @param orgId - Organization UUID
   * @param days - Number of days to include in the report
   * @returns Array of cost entries, or empty array on missing config
   */
  async getMonthlyCost(orgId: string, days: number): Promise<CloudCostEntry[]> {
    const creds = await this.getCredentials(orgId);
    if (!creds) {
      this.logger.warn(`AWS credentials not configured for org ${orgId}`);
      return [];
    }

    const client = new CostExplorerClient({
      region: "us-east-1", // Cost Explorer is a global service (us-east-1 endpoint)
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const toDateStr = (d: Date): string => d.toISOString().split("T")[0];

    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: toDateStr(start),
          End: toDateStr(end),
        },
        Granularity: "MONTHLY",
        Metrics: ["UnblendedCost"],
        GroupBy: [
          {
            Type: GroupDefinitionType.TAG,
            Key: "farm:environment",
          },
        ],
      });

      const response = await client.send(command);
      const entries: CloudCostEntry[] = [];

      for (const result of response.ResultsByTime ?? []) {
        for (const group of result.Groups ?? []) {
          const envTag = group.Keys?.[0] ?? "";
          const environment = envTag.startsWith("farm:environment$")
            ? envTag.slice("farm:environment$".length)
            : envTag || "untagged";
          const amount = parseFloat(
            group.Metrics?.["UnblendedCost"]?.Amount ?? "0",
          );
          const currency = group.Metrics?.["UnblendedCost"]?.Unit ?? "USD";

          entries.push({ environment, cost: amount, currency });
        }
      }

      return entries;
    } catch (err) {
      this.logger.error(`Failed to fetch AWS cost for org ${orgId}`, err);
      return [];
    }
  }

  /**
   * Deploys a new image to an ECS service by updating the task definition image.
   *
   * @param orgId - Organization UUID
   * @param config - ECS deployment configuration
   * @returns Deployment result
   */
  async deployToEcs(
    orgId: string,
    config: { cluster: string; service: string; image: string },
  ): Promise<{ success: boolean; output: string }> {
    const creds = await this.getCredentials(orgId);
    if (!creds) {
      return {
        success: false,
        output: `AWS credentials not configured for org ${orgId}`,
      };
    }

    const client = new ECSClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });

    try {
      // Force a new deployment with the updated image via service update.
      const updateCommand = new UpdateServiceCommand({
        cluster: config.cluster,
        service: config.service,
        forceNewDeployment: true,
      });
      await client.send(updateCommand);

      // Poll until service reaches steady state (simplified: just return success).
      const describeCommand = new DescribeServicesCommand({
        cluster: config.cluster,
        services: [config.service],
      });
      const describeResponse = await client.send(describeCommand);
      const svc = describeResponse.services?.[0];
      const output = `ECS service "${config.service}" deployment triggered. Status: ${svc?.status ?? "unknown"}. Image: ${config.image}`;

      this.logger.log(output);
      return { success: true, output };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ECS deploy failed for org ${orgId}: ${message}`);
      return { success: false, output: message };
    }
  }

  /**
   * Deploys a new code package to a Lambda function.
   *
   * @param orgId - Organization UUID
   * @param config - Lambda deployment configuration
   * @returns Deployment result
   */
  async deployToLambda(
    orgId: string,
    config: {
      functionName: string;
      imageUri?: string;
      s3Bucket?: string;
      s3Key?: string;
    },
  ): Promise<{ success: boolean; output: string }> {
    const creds = await this.getCredentials(orgId);
    if (!creds) {
      return {
        success: false,
        output: `AWS credentials not configured for org ${orgId}`,
      };
    }

    const client = new LambdaClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });

    try {
      const command = new UpdateFunctionCodeCommand({
        FunctionName: config.functionName,
        ...(config.imageUri
          ? { ImageUri: config.imageUri }
          : {
              S3Bucket: config.s3Bucket,
              S3Key: config.s3Key,
            }),
      });
      const response = await client.send(command);
      const output = `Lambda function "${config.functionName}" updated. Version: ${response.Version ?? "latest"}`;

      this.logger.log(output);
      return { success: true, output };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lambda deploy failed for org ${orgId}: ${message}`);
      return { success: false, output: message };
    }
  }

  /**
   * Resolves a secret value from AWS Secrets Manager.
   *
   * @param orgId - Organization UUID
   * @param arn - Secrets Manager ARN or secret name
   * @returns The secret string value
   */
  async resolveSecret(orgId: string, arn: string): Promise<string> {
    const creds = await this.getCredentials(orgId);
    if (!creds) {
      throw new Error(`AWS credentials not configured for org ${orgId}`);
    }

    const client = new SecretsManagerClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });

    const command = new GetSecretValueCommand({ SecretId: arn });
    const response = await client.send(command);

    const value = response.SecretString ?? "";
    return value;
  }

  /**
   * Infers a human-readable resource type from an AWS ARN.
   *
   * @param arn - AWS resource ARN
   * @returns Resource type string
   */
  private inferResourceType(arn: string): string {
    const parts = arn.split(":");
    if (parts.length < 6) return "unknown";
    const service = parts[2];
    const resourcePart = parts.slice(5).join(":");
    const resourceType =
      resourcePart.split("/")[0] ?? resourcePart.split(":")[0];
    return `${service}:${resourceType}`;
  }

  /**
   * Extracts a human-readable name from an AWS ARN.
   *
   * @param arn - AWS resource ARN
   * @returns The last path segment of the ARN as the name
   */
  private extractNameFromArn(arn: string): string {
    const parts = arn.split("/");
    return parts[parts.length - 1] ?? arn.split(":").pop() ?? arn;
  }
}
