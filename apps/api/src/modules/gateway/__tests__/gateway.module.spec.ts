jest.mock("@aws-sdk/client-api-gateway", () => ({
  APIGatewayClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  GetRestApisCommand: jest.fn(),
  GetResourcesCommand: jest.fn(),
}));
jest.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  GetMetricStatisticsCommand: jest.fn(),
}));
import { ConfigService } from "@nestjs/config";
import { gatewayAdaptersFactory } from "../gateway.module";
import { KongAdapter } from "../adapters/kong.adapter";
import { AwsApiGatewayAdapter } from "../adapters/aws-api-gateway.adapter";

function buildConfig(values: Record<string, boolean>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key] ?? false),
  } as unknown as ConfigService;
}

describe("gatewayAdaptersFactory", () => {
  it("returns an empty array when neither Kong nor AWS is enabled", () => {
    const result = gatewayAdaptersFactory(buildConfig({}));
    expect(result).toHaveLength(0);
  });

  it("returns a KongAdapter when only Kong is enabled", () => {
    const result = gatewayAdaptersFactory(
      buildConfig({ "gateway.kong.enabled": true }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(KongAdapter);
  });

  it("returns an AwsApiGatewayAdapter when only AWS is enabled", () => {
    const result = gatewayAdaptersFactory(
      buildConfig({ "gateway.aws.enabled": true }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(AwsApiGatewayAdapter);
  });

  it("returns both adapters when Kong and AWS are both enabled", () => {
    const result = gatewayAdaptersFactory(
      buildConfig({
        "gateway.kong.enabled": true,
        "gateway.aws.enabled": true,
      }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(KongAdapter);
    expect(result[1]).toBeInstanceOf(AwsApiGatewayAdapter);
  });
});
