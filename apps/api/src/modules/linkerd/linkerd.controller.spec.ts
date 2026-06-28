import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { LinkerdController } from "./linkerd.controller";
import { LinkerdService } from "./linkerd.service";
import { LinkerdMetricsService } from "./linkerd-metrics.service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeStatus = {
  installed: true,
  components: [
    { name: "linkerd-controller", ready: true, version: "stable-2.14.0" },
  ],
};

const fakeServerAuth = {
  name: "sa-1",
  namespace: "default",
  server: "my-server",
  clients: ["default/client-sa"],
};

const fakeAuthPolicy = {
  name: "policy-1",
  namespace: "default",
  targetRef: { kind: "Server", name: "my-server" },
  requiredAuthenticationRefs: [
    { name: "my-auth", kind: "MeshTLSAuthentication" },
  ],
};

const fakeServiceProfile = {
  name: "my-svc.default.svc.cluster.local",
  namespace: "default",
  routes: [
    {
      name: "GET /api",
      condition: { pathRegex: "/api", method: "GET" },
      isRetryable: true,
      timeout: "250ms",
    },
  ],
  retryBudget: { retryRatio: 0.2, minRetriesPerSecond: 10, ttl: "10s" },
};

const fakeRps = {
  timeseries: [{ metric: {}, values: [[1700000000, "0.5"]] }],
  query: "rate(request_total[5m])",
};

const fakeLatency = {
  p50: { timeseries: [], query: "p50" },
  p95: { timeseries: [], query: "p95" },
  p99: { timeseries: [], query: "p99" },
};

const fakeEdge = {
  source: "frontend",
  destination: "backend",
  namespace: "default",
  rps: 1.5,
};

// ---------------------------------------------------------------------------
// Mock services
// ---------------------------------------------------------------------------

const mockLinkerdService = {
  isLinkerdEnabled: jest.fn(),
  getStatus: jest.fn(),
  listServerAuthorizations: jest.fn(),
  listAuthorizationPolicies: jest.fn(),
  listServiceProfiles: jest.fn(),
};

const mockLinkerdMetricsService = {
  getServiceRps: jest.fn(),
  getServiceErrorRate: jest.fn(),
  getServiceLatency: jest.fn(),
  buildTopology: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("LinkerdController", () => {
  let controller: LinkerdController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkerdController],
      providers: [
        { provide: LinkerdService, useValue: mockLinkerdService },
        { provide: LinkerdMetricsService, useValue: mockLinkerdMetricsService },
        Reflector,
      ],
    })
      .compile();

    controller = module.get<LinkerdController>(LinkerdController);
  });

  // ---------------------------------------------------------------------------
  // GET /status
  // ---------------------------------------------------------------------------

  describe("getStatus", () => {
    it("returns Linkerd status with components", async () => {
      mockLinkerdService.getStatus.mockResolvedValue(fakeStatus);

      const result = await controller.getStatus();
      expect(result).toEqual(fakeStatus);
      expect(result.installed).toBe(true);
      expect(result.components).toHaveLength(1);
    });

    it("passes kubeconfig parameter to the service", async () => {
      mockLinkerdService.getStatus.mockResolvedValue(fakeStatus);

      await controller.getStatus("/path/to/kubeconfig");
      expect(mockLinkerdService.getStatus).toHaveBeenCalledWith(
        "/path/to/kubeconfig",
      );
    });

    it("passes array kubeconfig to the service without throwing", async () => {
      mockLinkerdService.getStatus.mockResolvedValue(fakeStatus);

      await controller.getStatus(["/path/a", "/path/b"]);
      expect(mockLinkerdService.getStatus).toHaveBeenCalledWith([
        "/path/a",
        "/path/b",
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /server-authorizations
  // ---------------------------------------------------------------------------

  describe("listServerAuthorizations", () => {
    it("returns an array of ServerAuthorizations", async () => {
      mockLinkerdService.listServerAuthorizations.mockResolvedValue([
        fakeServerAuth,
      ]);

      const result = await controller.listServerAuthorizations("default");
      expect(result).toEqual([fakeServerAuth]);
      expect(mockLinkerdService.listServerAuthorizations).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });

    it("falls back to 'default' namespace when none is provided", async () => {
      mockLinkerdService.listServerAuthorizations.mockResolvedValue([]);

      await controller.listServerAuthorizations(undefined as unknown as string);
      expect(mockLinkerdService.listServerAuthorizations).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });

    it("returns empty array gracefully", async () => {
      mockLinkerdService.listServerAuthorizations.mockResolvedValue([]);

      const result = await controller.listServerAuthorizations("production");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /authorization-policies
  // ---------------------------------------------------------------------------

  describe("listAuthorizationPolicies", () => {
    it("returns an array of AuthorizationPolicies", async () => {
      mockLinkerdService.listAuthorizationPolicies.mockResolvedValue([
        fakeAuthPolicy,
      ]);

      const result = await controller.listAuthorizationPolicies("default");
      expect(result).toEqual([fakeAuthPolicy]);
      expect(mockLinkerdService.listAuthorizationPolicies).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });

    it("falls back to 'default' namespace when none is provided", async () => {
      mockLinkerdService.listAuthorizationPolicies.mockResolvedValue([]);

      await controller.listAuthorizationPolicies(
        undefined as unknown as string,
      );
      expect(mockLinkerdService.listAuthorizationPolicies).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /service-profiles
  // ---------------------------------------------------------------------------

  describe("listServiceProfiles", () => {
    it("returns an array of ServiceProfiles with routes", async () => {
      mockLinkerdService.listServiceProfiles.mockResolvedValue([
        fakeServiceProfile,
      ]);

      const result = await controller.listServiceProfiles("default");
      expect(result).toEqual([fakeServiceProfile]);
      expect(result[0].routes).toHaveLength(1);
    });

    it("falls back to 'default' namespace when none is provided", async () => {
      mockLinkerdService.listServiceProfiles.mockResolvedValue([]);

      await controller.listServiceProfiles(undefined as unknown as string);
      expect(mockLinkerdService.listServiceProfiles).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /metrics/rps
  // ---------------------------------------------------------------------------

  describe("getMetricsRps", () => {
    it("returns RPS timeseries", async () => {
      mockLinkerdMetricsService.getServiceRps.mockResolvedValue(fakeRps);

      const result = await controller.getMetricsRps(
        "my-service",
        "default",
        "5m",
      );
      expect(result).toEqual(fakeRps);
      expect(mockLinkerdMetricsService.getServiceRps).toHaveBeenCalledWith(
        "my-service",
        "default",
        "5m",
      );
    });

    it("uses 5m as the default range", async () => {
      mockLinkerdMetricsService.getServiceRps.mockResolvedValue(fakeRps);

      await controller.getMetricsRps("svc", "ns");
      expect(mockLinkerdMetricsService.getServiceRps).toHaveBeenCalledWith(
        "svc",
        "ns",
        "5m",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /metrics/error-rate
  // ---------------------------------------------------------------------------

  describe("getMetricsErrorRate", () => {
    it("returns error rate timeseries", async () => {
      mockLinkerdMetricsService.getServiceErrorRate.mockResolvedValue(fakeRps);

      const result = await controller.getMetricsErrorRate("svc", "ns", "1h");
      expect(result).toEqual(fakeRps);
    });

    it("uses 5m as the default range", async () => {
      mockLinkerdMetricsService.getServiceErrorRate.mockResolvedValue(fakeRps);

      await controller.getMetricsErrorRate("svc", "ns");
      expect(
        mockLinkerdMetricsService.getServiceErrorRate,
      ).toHaveBeenCalledWith("svc", "ns", "5m");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /metrics/latency
  // ---------------------------------------------------------------------------

  describe("getMetricsLatency", () => {
    it("returns P50/P95/P99 latency", async () => {
      mockLinkerdMetricsService.getServiceLatency.mockResolvedValue(
        fakeLatency,
      );

      const result = await controller.getMetricsLatency("svc", "ns", "5m");
      expect(result).toEqual(fakeLatency);
      expect(result.p50).toBeDefined();
      expect(result.p95).toBeDefined();
      expect(result.p99).toBeDefined();
    });

    it("uses 5m as the default range", async () => {
      mockLinkerdMetricsService.getServiceLatency.mockResolvedValue(
        fakeLatency,
      );

      await controller.getMetricsLatency("svc", "ns");
      expect(mockLinkerdMetricsService.getServiceLatency).toHaveBeenCalledWith(
        "svc",
        "ns",
        "5m",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /topology
  // ---------------------------------------------------------------------------

  describe("getTopology", () => {
    it("returns topology edges", async () => {
      mockLinkerdMetricsService.buildTopology.mockResolvedValue([fakeEdge]);

      const result = await controller.getTopology("5m");
      expect(result).toEqual([fakeEdge]);
      expect(mockLinkerdMetricsService.buildTopology).toHaveBeenCalledWith(
        "5m",
      );
    });

    it("uses 5m as the default range", async () => {
      mockLinkerdMetricsService.buildTopology.mockResolvedValue([]);

      await controller.getTopology();
      expect(mockLinkerdMetricsService.buildTopology).toHaveBeenCalledWith(
        "5m",
      );
    });

    it("returns empty array when no topology is available", async () => {
      mockLinkerdMetricsService.buildTopology.mockResolvedValue([]);

      const result = await controller.getTopology("5m");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /available
  // ---------------------------------------------------------------------------

  describe("getAvailability", () => {
    it("returns available: true when Linkerd is enabled", async () => {
      mockLinkerdService.isLinkerdEnabled.mockResolvedValue(true);

      const result = await controller.getAvailability();
      expect(result).toEqual({ available: true });
    });

    it("returns available: false with reason when Linkerd is not detected", async () => {
      mockLinkerdService.isLinkerdEnabled.mockResolvedValue(false);

      const result = await controller.getAvailability();
      expect(result).toEqual({
        available: false,
        reason: "Linkerd not detected in cluster",
      });
    });
  });
});
