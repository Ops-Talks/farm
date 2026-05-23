import { ConfigService } from "@nestjs/config";
import { registryAdapterFactory } from "../registry.module";
import { EcrAdapter } from "../adapters/ecr.adapter";
import { GcrAdapter } from "../adapters/gcr.adapter";
import { DockerHubAdapter } from "../adapters/docker-hub.adapter";
import { HarborAdapter } from "../adapters/harbor.adapter";
import { RegistryType } from "../enums/registry-type.enum";
import { CircuitBreakerService } from "../../../common/circuit-breaker/circuit-breaker.service";

jest.mock("@aws-sdk/client-ecr", () => ({
  ECRClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  DescribeRepositoriesCommand: jest.fn(),
  DescribeImagesCommand: jest.fn(),
  DescribeImageScanFindingsCommand: jest.fn(),
}));

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  })),
}));

function makeConfigService(type: string): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === "registry.type") return type;
      if (key === "registry.credentials") {
        if (type === "ecr") {
          return JSON.stringify({
            accessKeyId: "k",
            secretAccessKey: "s",
            region: "us-east-1",
          });
        }
        if (type === "gcr") {
          return JSON.stringify({
            project_id: "proj",
            type: "service_account",
          });
        }
        if (type === "dockerhub") {
          return JSON.stringify({ username: "user", password: "pass" });
        }
        if (type === "harbor") {
          return JSON.stringify({ username: "admin", password: "Harbor12345" });
        }
        return "";
      }
      if (key === "registry.url") return "";
      return "";
    }),
  } as unknown as ConfigService;
}

const mockCb = {
  fire: jest.fn((_, fn: () => unknown) => fn()),
} as unknown as CircuitBreakerService;

describe("registryAdapterFactory", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return EcrAdapter when type is ecr", () => {
    const config = makeConfigService("ecr");
    const adapter = registryAdapterFactory(config, mockCb);

    expect(adapter).toBeInstanceOf(EcrAdapter);
    expect(adapter?.type).toBe(RegistryType.ECR);
  });

  it("should return GcrAdapter when type is gcr", () => {
    const config = makeConfigService("gcr");
    const adapter = registryAdapterFactory(config, mockCb);

    expect(adapter).toBeInstanceOf(GcrAdapter);
    expect(adapter?.type).toBe(RegistryType.GCR);
  });

  it("should return DockerHubAdapter when type is dockerhub", () => {
    const config = makeConfigService("dockerhub");
    const adapter = registryAdapterFactory(config, mockCb);

    expect(adapter).toBeInstanceOf(DockerHubAdapter);
    expect(adapter?.type).toBe(RegistryType.DOCKER_HUB);
  });

  it("should return null when type is empty string", () => {
    const config = makeConfigService("");
    const adapter = registryAdapterFactory(config, mockCb);

    expect(adapter).toBeNull();
  });

  it("should return null when type is unrecognized", () => {
    const config = makeConfigService("unknown-registry");
    const adapter = registryAdapterFactory(config, mockCb);

    expect(adapter).toBeNull();
  });

  it("should return HarborAdapter when type is harbor", () => {
    const config = makeConfigService("harbor");
    const adapter = registryAdapterFactory(config, mockCb);

    expect(adapter).toBeInstanceOf(HarborAdapter);
    expect(adapter?.type).toBe(RegistryType.HARBOR);
  });
});
