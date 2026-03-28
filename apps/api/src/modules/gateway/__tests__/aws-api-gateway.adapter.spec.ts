import { ConfigService } from "@nestjs/config";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";

// Mock AWS SDK modules before importing the adapter.
jest.mock("@aws-sdk/client-api-gateway");
jest.mock("@aws-sdk/client-cloudwatch");

import { AwsApiGatewayAdapter } from "../adapters/aws-api-gateway.adapter";
import {
  APIGatewayClient,
  GetRestApisCommand,
  GetResourcesCommand,
} from "@aws-sdk/client-api-gateway";
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";

const MockAPIGatewayClient = (
  jest.requireMock("@aws-sdk/client-api-gateway") as unknown as {
    APIGatewayClient: jest.MockedClass<typeof APIGatewayClient>;
  }
).APIGatewayClient;

const MockCloudWatchClient = (
  jest.requireMock("@aws-sdk/client-cloudwatch") as unknown as {
    CloudWatchClient: jest.MockedClass<typeof CloudWatchClient>;
  }
).CloudWatchClient;

/**
 * Builds a minimal ConfigService mock.
 */
function buildConfigService(
  values: Record<string, string | boolean>,
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key] ?? ""),
  } as unknown as ConfigService;
}

describe("AwsApiGatewayAdapter", () => {
  let apiGatewaySendMock: jest.Mock;
  let cloudWatchSendMock: jest.Mock;

  beforeEach(() => {
    apiGatewaySendMock = jest.fn();
    cloudWatchSendMock = jest.fn();

    MockAPIGatewayClient.prototype.send = apiGatewaySendMock;
    MockCloudWatchClient.prototype.send = cloudWatchSendMock;
  });

  afterEach(() => jest.clearAllMocks());

  it("should have type AWS", () => {
    const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
    const adapter = new AwsApiGatewayAdapter(config);
    expect(adapter.type).toBe(GatewayType.AWS);
  });

  describe("getRoutes()", () => {
    it("should return empty array when no REST APIs exist", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({ items: [] });

      const routes = await adapter.getRoutes();

      expect(apiGatewaySendMock).toHaveBeenCalledWith(
        expect.any(GetRestApisCommand),
      );
      expect(routes).toHaveLength(0);
    });

    it("should call GetResourcesCommand for each REST API", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock
        .mockResolvedValueOnce({
          items: [{ id: "api-1", name: "My API" }],
        })
        .mockResolvedValueOnce({
          items: [
            {
              id: "res-1",
              path: "/users",
              resourceMethods: { GET: {}, POST: {} },
            },
          ],
        });

      const routes = await adapter.getRoutes();

      expect(apiGatewaySendMock).toHaveBeenCalledTimes(2);
      expect(apiGatewaySendMock).toHaveBeenNthCalledWith(
        2,
        expect.any(GetResourcesCommand),
      );
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        externalId: "api-1::res-1",
        name: "My API /users",
        paths: ["/users"],
        methods: expect.arrayContaining(["GET", "POST"]) as string[],
        gatewayType: GatewayType.AWS,
      });
    });

    it("should skip resources with no methods", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock
        .mockResolvedValueOnce({
          items: [{ id: "api-1", name: "My API" }],
        })
        .mockResolvedValueOnce({
          items: [{ id: "res-1", path: "/", resourceMethods: undefined }],
        });

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });
  });

  describe("getHealth()", () => {
    it("should return empty array when no REST APIs exist", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({ items: [] });

      const health = await adapter.getHealth();

      expect(health).toHaveLength(0);
    });

    it("should call GetMetricStatisticsCommand for each API", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock.mockResolvedValue({ Datapoints: [] });

      const health = await adapter.getHealth();

      expect(cloudWatchSendMock).toHaveBeenCalledWith(
        expect.any(GetMetricStatisticsCommand),
      );
      expect(health).toHaveLength(1);
      expect(health[0].status).toBe(HealthStatus.UP);
    });

    it("should return DOWN status when 5XXError sum > 0", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock
        .mockResolvedValueOnce({ Datapoints: [{ Sum: 5 }] }) // 5XX
        .mockResolvedValueOnce({ Datapoints: [] }) // 4XX
        .mockResolvedValueOnce({ Datapoints: [] }); // Latency

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should return DEGRADED status when 4XXError sum > 0 and no 5XXErrors", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock
        .mockResolvedValueOnce({ Datapoints: [] }) // 5XX
        .mockResolvedValueOnce({ Datapoints: [{ Sum: 3 }] }) // 4XX
        .mockResolvedValueOnce({ Datapoints: [] }); // Latency

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.DEGRADED);
    });
  });
});
