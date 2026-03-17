import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { KubernetesService } from "./kubernetes.service";

// Factory-level mock function references
let mockLoadFromFile: jest.Mock;
let mockLoadFromCluster: jest.Mock;
let mockMakeApiClient: jest.Mock;
let mockListDeployments: jest.Mock;

jest.mock("@kubernetes/client-node", () => {
  // Use module-level variables initialized before each test
  return {
    KubeConfig: jest.fn().mockImplementation(() => ({
      get loadFromFile() {
        return mockLoadFromFile;
      },
      get loadFromCluster() {
        return mockLoadFromCluster;
      },
      get makeApiClient() {
        return mockMakeApiClient;
      },
    })),
    AppsV1Api: jest.fn(),
  };
});

function buildFakeDeployments(items: object[]) {
  return { items };
}

function fakeDeploymentItem(overrides: {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  replicas?: number;
  readyReplicas?: number;
  image?: string;
}) {
  return {
    metadata: {
      name: overrides.name,
      namespace: overrides.namespace ?? "default",
      labels: overrides.labels ?? {},
    },
    spec: {
      replicas: overrides.replicas ?? 1,
      template: {
        spec: {
          containers: [{ image: overrides.image ?? "image:latest" }],
        },
      },
    },
    status: { readyReplicas: overrides.readyReplicas ?? 1 },
  };
}

describe("KubernetesService", () => {
  let service: KubernetesService;

  const mockConfigService = {
    get: (key: string) => {
      if (key === "kubernetes.kubeconfigPath") return "/fake/kubeconfig";
      return "";
    },
  };

  beforeEach(async () => {
    // Create fresh mock functions for each test
    mockListDeployments = jest.fn();
    mockLoadFromFile = jest.fn();
    mockLoadFromCluster = jest.fn().mockImplementation(() => {
      throw new Error("not in cluster");
    });
    mockMakeApiClient = jest.fn().mockReturnValue({
      listDeploymentForAllNamespaces: mockListDeployments,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KubernetesService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KubernetesService>(KubernetesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("discoverWorkloads", () => {
    it("should return an array of workloads from the cluster", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "user-service",
            namespace: "default",
            labels: { app: "user-service", team: "platform" },
            replicas: 3,
            readyReplicas: 3,
            image: "user-service:1.0.0",
          }),
          fakeDeploymentItem({
            name: "payment-service",
            namespace: "payments",
            labels: { app: "payment-service" },
            replicas: 2,
            readyReplicas: 1,
            image: "payment-service:2.1.0",
          }),
        ]),
      );

      const workloads = await service.discoverWorkloads();

      expect(workloads).toHaveLength(2);
      expect(workloads[0]).toMatchObject({
        name: "user-service",
        namespace: "default",
        replicas: 3,
        readyReplicas: 3,
        image: "user-service:1.0.0",
        labels: { app: "user-service", team: "platform" },
      });
      expect(workloads[1]).toMatchObject({
        name: "payment-service",
        namespace: "payments",
        replicas: 2,
        readyReplicas: 1,
      });
    });

    it("should return empty array when API call fails", async () => {
      mockListDeployments.mockRejectedValue(new Error("API unavailable"));

      const workloads = await service.discoverWorkloads();
      expect(workloads).toEqual([]);
    });

    it("should handle empty items array", async () => {
      mockListDeployments.mockResolvedValue(buildFakeDeployments([]));

      const workloads = await service.discoverWorkloads();
      expect(workloads).toEqual([]);
    });
  });

  describe("matchComponent", () => {
    it("should match workloads by name", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "user-service",
            labels: { app: "user-service" },
          }),
          fakeDeploymentItem({
            name: "payment-service",
            labels: { app: "payment" },
          }),
        ]),
      );

      const matches = await service.matchComponent("user");
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("user-service");
    });

    it("should match workloads by label value", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({
            name: "backend",
            labels: { component: "catalog-api" },
          }),
        ]),
      );

      const matches = await service.matchComponent("catalog");
      expect(matches).toHaveLength(1);
    });

    it("should return empty array when no workloads match", async () => {
      mockListDeployments.mockResolvedValue(
        buildFakeDeployments([
          fakeDeploymentItem({ name: "unrelated", labels: {} }),
        ]),
      );

      const matches = await service.matchComponent("no-match");
      expect(matches).toEqual([]);
    });
  });

  describe("isEnabled", () => {
    it("should return true when client initialized successfully", () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
