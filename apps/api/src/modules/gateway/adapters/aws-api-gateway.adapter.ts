import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  APIGatewayClient,
  GetRestApisCommand,
  GetResourcesCommand,
  Resource,
} from "@aws-sdk/client-api-gateway";
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";
import {
  IGatewayAdapter,
  GatewayRouteDto,
  GatewayHealthDto,
} from "../interfaces/gateway-adapter.interface";

/**
 * Adapter that integrates with AWS API Gateway (REST APIs) and CloudWatch to
 * retrieve route definitions and health metrics.
 */
export class AwsApiGatewayAdapter implements IGatewayAdapter {
  readonly type = GatewayType.AWS;

  private readonly logger = new Logger(AwsApiGatewayAdapter.name);
  private readonly apiGatewayClient: APIGatewayClient;
  private readonly cloudWatchClient: CloudWatchClient;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>("gateway.aws.region") ?? "us-east-1";
    const accessKeyId =
      config.get<string>("gateway.aws.accessKeyId") ?? undefined;
    const secretAccessKey =
      config.get<string>("gateway.aws.secretAccessKey") ?? undefined;

    const credentials =
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined;

    this.apiGatewayClient = new APIGatewayClient({ region, credentials });
    this.cloudWatchClient = new CloudWatchClient({ region, credentials });
  }

  /**
   * Fetches all REST APIs and enumerates their resources to build route entries.
   * Each resource method combination becomes a GatewayRouteDto.
   */
  async getRoutes(): Promise<GatewayRouteDto[]> {
    const routes: GatewayRouteDto[] = [];

    const apisResponse = await this.apiGatewayClient.send(
      new GetRestApisCommand({ limit: 500 }),
    );

    const apis = apisResponse.items ?? [];

    for (const api of apis) {
      if (!api.id || !api.name) continue;

      try {
        const resourcesResponse = await this.apiGatewayClient.send(
          new GetResourcesCommand({ restApiId: api.id, limit: 500 }),
        );

        const resources: Resource[] = resourcesResponse.items ?? [];

        for (const resource of resources) {
          if (!resource.path) continue;
          const methods = resource.resourceMethods
            ? Object.keys(resource.resourceMethods)
            : [];

          if (methods.length === 0) continue;

          routes.push({
            externalId: `${api.id}::${resource.id ?? resource.path}`,
            name: `${api.name} ${resource.path}`,
            paths: [resource.path],
            methods,
            tags: [],
            gatewayType: GatewayType.AWS,
          });
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch resources for API ${api.id}: ${String(err)}`,
        );
      }
    }

    this.logger.log(`Fetched ${routes.length} routes from AWS API Gateway`);
    return routes;
  }

  /**
   * Queries CloudWatch for 4XXError, 5XXError, and Latency metrics for each
   * REST API. Derives a health status from the metric data.
   *
   * Status rules:
   * - DOWN if 5XXError count > 0 in the last 5 minutes
   * - DEGRADED if 4XXError count > 0 in the last 5 minutes
   * - UP otherwise
   */
  async getHealth(): Promise<GatewayHealthDto[]> {
    const healthChecks: GatewayHealthDto[] = [];

    const apisResponse = await this.apiGatewayClient.send(
      new GetRestApisCommand({ limit: 500 }),
    );

    const apis = apisResponse.items ?? [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);

    for (const api of apis) {
      if (!api.id || !api.name) continue;

      try {
        const [fiveXxResponse, fourXxResponse, latencyResponse] =
          await Promise.all([
            this.cloudWatchClient.send(
              new GetMetricStatisticsCommand({
                Namespace: "AWS/ApiGateway",
                MetricName: "5XXError",
                Dimensions: [{ Name: "ApiName", Value: api.name }],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300,
                Statistics: ["Sum"],
              }),
            ),
            this.cloudWatchClient.send(
              new GetMetricStatisticsCommand({
                Namespace: "AWS/ApiGateway",
                MetricName: "4XXError",
                Dimensions: [{ Name: "ApiName", Value: api.name }],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300,
                Statistics: ["Sum"],
              }),
            ),
            this.cloudWatchClient.send(
              new GetMetricStatisticsCommand({
                Namespace: "AWS/ApiGateway",
                MetricName: "Latency",
                Dimensions: [{ Name: "ApiName", Value: api.name }],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300,
                Statistics: ["Average"],
              }),
            ),
          ]);

        const fiveXxSum = (fiveXxResponse.Datapoints ?? []).reduce(
          (acc, dp) => acc + (dp.Sum ?? 0),
          0,
        );

        const fourXxSum = (fourXxResponse.Datapoints ?? []).reduce(
          (acc, dp) => acc + (dp.Sum ?? 0),
          0,
        );

        const latencyDatapoints = latencyResponse.Datapoints ?? [];
        const latencyAvg =
          latencyDatapoints.length > 0
            ? latencyDatapoints.reduce(
                (acc, dp) => acc + (dp.Average ?? 0),
                0,
              ) / latencyDatapoints.length
            : null;

        let status: HealthStatus = HealthStatus.UP;
        if (fiveXxSum > 0) {
          status = HealthStatus.DOWN;
        } else if (fourXxSum > 0) {
          status = HealthStatus.DEGRADED;
        }

        healthChecks.push({
          url: `https://${api.id}.execute-api.${this.config.get<string>("gateway.aws.region") ?? "us-east-1"}.amazonaws.com`,
          status,
          latencyMs: latencyAvg !== null ? Math.round(latencyAvg) : null,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to fetch CloudWatch metrics for API ${api.id}: ${String(err)}`,
        );
        healthChecks.push({
          url: `https://${api.id}.execute-api.${this.config.get<string>("gateway.aws.region") ?? "us-east-1"}.amazonaws.com`,
          status: HealthStatus.DOWN,
          latencyMs: null,
        });
      }
    }

    this.logger.log(
      `Fetched health for ${healthChecks.length} AWS API Gateway APIs`,
    );
    return healthChecks;
  }
}
