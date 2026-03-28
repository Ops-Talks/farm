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

  it("should use provided credentials when accessKeyId and secretAccessKey are set", () => {
    const config = buildConfigService({
      "gateway.aws.region": "eu-west-1",
      "gateway.aws.accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "gateway.aws.secretAccessKey": "secret",
    });
    const adapter = new AwsApiGatewayAdapter(config);
    expect(adapter.type).toBe(GatewayType.AWS);
    expect(MockAPIGatewayClient).toHaveBeenCalled();
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

    it("should skip APIs that have no id or name", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValueOnce({
        items: [{ id: undefined, name: undefined }],
      });

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
      expect(apiGatewaySendMock).toHaveBeenCalledTimes(1);
    });

    it("should use resource path as externalId segment when resource has no id", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock
        .mockResolvedValueOnce({
          items: [{ id: "api-1", name: "My API" }],
        })
        .mockResolvedValueOnce({
          items: [
            {
              id: undefined,
              path: "/orders",
              resourceMethods: { GET: {} },
            },
          ],
        });

      const routes = await adapter.getRoutes();

      expect(routes[0].externalId).toBe("api-1::/orders");
    });

    it("should handle GetResourcesCommand error gracefully and continue", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock
        .mockResolvedValueOnce({
          items: [
            { id: "api-1", name: "API One" },
            { id: "api-2", name: "API Two" },
          ],
        })
        .mockRejectedValueOnce(new Error("Access denied"))
        .mockResolvedValueOnce({
          items: [{ id: "res-1", path: "/v2", resourceMethods: { GET: {} } }],
        });

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0].externalId).toBe("api-2::res-1");
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

    it("should compute latencyMs average when CloudWatch returns latency datapoints", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock
        .mockResolvedValueOnce({ Datapoints: [] }) // 5XX
        .mockResolvedValueOnce({ Datapoints: [] }) // 4XX
        .mockResolvedValueOnce({
          Datapoints: [{ Average: 100 }, { Average: 200 }],
        }); // Latency

      const health = await adapter.getHealth();

      expect(health[0].latencyMs).toBe(150);
      expect(health[0].status).toBe(HealthStatus.UP);
    });

    it("should skip APIs that have no id or name", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: undefined, name: undefined }],
      });

      const health = await adapter.getHealth();

      expect(health).toHaveLength(0);
      expect(cloudWatchSendMock).not.toHaveBeenCalled();
    });

    it("should handle CloudWatch errors gracefully and push DOWN status", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock.mockRejectedValue(new Error("CloudWatch timeout"));

      const health = await adapter.getHealth();

      expect(health).toHaveLength(1);
      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should use undefined region fallback in URL when region config is absent", async () => {
      const undefinedConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const adapter = new AwsApiGatewayAdapter(undefinedConfig);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock
        .mockResolvedValueOnce({ Datapoints: [] })
        .mockResolvedValueOnce({ Datapoints: [] })
        .mockResolvedValueOnce({ Datapoints: [] });

      const health = await adapter.getHealth();

      expect(health[0].url).toContain("us-east-1");
    });

    it("should handle undefined Datapoints and undefined Sum/Average values", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock
        .mockResolvedValueOnce({ Datapoints: [{ Sum: undefined }] })
        .mockResolvedValueOnce({ Datapoints: [{ Sum: undefined }] })
        .mockResolvedValueOnce({ Datapoints: [{ Average: undefined }] });

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.UP);
      expect(health[0].latencyMs).toBe(0);
    });

    it("should handle missing Datapoints key in CloudWatch response", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock.mockResolvedValue({});

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.UP);
      expect(health[0].latencyMs).toBeNull();
    });

    it("should use undefined region fallback in catch block URL", async () => {
      const undefinedConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const adapter = new AwsApiGatewayAdapter(undefinedConfig);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: "My API" }],
      });

      cloudWatchSendMock.mockRejectedValue(new Error("timeout"));

      const health = await adapter.getHealth();

      expect(health[0].url).toContain("us-east-1");
      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should handle undefined items in GetRestApis response for getHealth", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({});

      const health = await adapter.getHealth();

      expect(health).toHaveLength(0);
    });
  });

  describe("getRoutes() additional null-coalescing branches", () => {
    it("should handle undefined items in GetRestApis response", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({});

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });

    it("should handle undefined items in GetResources response", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock
        .mockResolvedValueOnce({ items: [{ id: "api-1", name: "My API" }] })
        .mockResolvedValueOnce({});

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });

    it("should skip resources that have no path", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock
        .mockResolvedValueOnce({ items: [{ id: "api-1", name: "My API" }] })
        .mockResolvedValueOnce({
          items: [
            { id: "res-1", path: undefined, resourceMethods: { GET: {} } },
          ],
        });

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });

    it("should skip APIs where id is set but name is undefined", async () => {
      const config = buildConfigService({ "gateway.aws.region": "us-east-1" });
      const adapter = new AwsApiGatewayAdapter(config);

      apiGatewaySendMock.mockResolvedValue({
        items: [{ id: "api-1", name: undefined }],
      });

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });
  });

  describe("constructor null-coalescing branches", () => {
    it("should default region to us-east-1 when region config is undefined", () => {
      const undefinedConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const adapter = new AwsApiGatewayAdapter(undefinedConfig);
      expect(adapter.type).toBe(GatewayType.AWS);
    });
  });
});
