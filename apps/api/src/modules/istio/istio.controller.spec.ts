import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IstioController } from "./istio.controller";
import { IstioService } from "./istio.service";
import { IstioMetricsService } from "./istio-metrics.service";
import { RolesGuard } from "../../common/guards/roles.guard";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeVS = {
  name: "checkout-vs",
  namespace: "default",
  hosts: ["checkout"],
  gateways: [],
  http: [{ route: [{ destination: "stable", weight: 100 }] }],
  labels: {},
};

const fakePeerAuth = {
  name: "default-pa",
  namespace: "default",
  selector: {},
  mtlsMode: "STRICT" as const,
};

const fakeAuthPolicy = {
  name: "allow-nothing",
  namespace: "default",
  selector: {},
  action: "ALLOW" as const,
  rules: [],
  hasNoRules: true,
};

const fakeEdge = {
  source: "checkout",
  destination: "payment",
  weight: 80,
  namespace: "default",
};

const fakeRps = {
  timeseries: [{ metric: {}, values: [[1700000000, "0.5"]] }],
  query: "rate(istio_requests_total{}[5m])",
};

const fakeLatency = {
  p50: { timeseries: [], query: "p50" },
  p95: { timeseries: [], query: "p95" },
  p99: { timeseries: [], query: "p99" },
};

// ---------------------------------------------------------------------------
// Mock services
// ---------------------------------------------------------------------------

const mockIstioService = {
  isIstioEnabled: jest.fn(),
  getVirtualServices: jest.fn(),
  getVirtualService: jest.fn(),
  patchVirtualServiceWeights: jest.fn(),
  getPeerAuthentications: jest.fn(),
  getAuthorizationPolicies: jest.fn(),
  buildTopology: jest.fn(),
};

const mockIstioMetricsService = {
  getServiceRps: jest.fn(),
  getServiceErrorRate: jest.fn(),
  getServiceLatency: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("IstioController", () => {
  let controller: IstioController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IstioController],
      providers: [
        { provide: IstioService, useValue: mockIstioService },
        { provide: IstioMetricsService, useValue: mockIstioMetricsService },
        Reflector,
      ],
    })
      .compile();

    controller = module.get<IstioController>(IstioController);
  });

  // ---------------------------------------------------------------------------
  // GET /status
  // ---------------------------------------------------------------------------

  describe("getStatus", () => {
    it("returns { istioEnabled: true } when Istio is installed", async () => {
      mockIstioService.isIstioEnabled.mockResolvedValue(true);
      const result = await controller.getStatus();
      expect(result).toEqual({ istioEnabled: true });
    });

    it("returns { istioEnabled: false } when Istio is not installed", async () => {
      mockIstioService.isIstioEnabled.mockResolvedValue(false);
      const result = await controller.getStatus();
      expect(result).toEqual({ istioEnabled: false });
    });

    it("passes kubeconfig parameter to the service", async () => {
      mockIstioService.isIstioEnabled.mockResolvedValue(true);
      await controller.getStatus("/path/to/kubeconfig");
      expect(mockIstioService.isIstioEnabled).toHaveBeenCalledWith(
        "/path/to/kubeconfig",
      );
    });

    it("passes array kubeconfig parameter to the service without throwing", async () => {
      mockIstioService.isIstioEnabled.mockResolvedValue(true);
      await controller.getStatus(["/path/a", "/path/b"]);
      expect(mockIstioService.isIstioEnabled).toHaveBeenCalledWith([
        "/path/a",
        "/path/b",
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /virtual-services
  // ---------------------------------------------------------------------------

  describe("listVirtualServices", () => {
    it("returns an array of VirtualServices", async () => {
      mockIstioService.getVirtualServices.mockResolvedValue([fakeVS]);
      const result = await controller.listVirtualServices("default");
      expect(result).toEqual([fakeVS]);
      expect(mockIstioService.getVirtualServices).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });

    it("falls back to 'default' namespace when none is provided", async () => {
      mockIstioService.getVirtualServices.mockResolvedValue([]);
      await controller.listVirtualServices(undefined as unknown as string);
      expect(mockIstioService.getVirtualServices).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });

    it("returns empty array gracefully", async () => {
      mockIstioService.getVirtualServices.mockResolvedValue([]);
      const result = await controller.listVirtualServices("production");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /virtual-services/:namespace/:name
  // ---------------------------------------------------------------------------

  describe("getVirtualService", () => {
    it("returns a single VirtualService", async () => {
      mockIstioService.getVirtualService.mockResolvedValue(fakeVS);
      const result = await controller.getVirtualService(
        "default",
        "checkout-vs",
      );
      expect(result).toEqual(fakeVS);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /virtual-services/:namespace/:name/weights
  // ---------------------------------------------------------------------------

  describe("patchWeights", () => {
    it("calls patchVirtualServiceWeights with correct arguments", async () => {
      mockIstioService.patchVirtualServiceWeights.mockResolvedValue(undefined);
      const body = {
        weights: [
          { destination: "stable", weight: 90 },
          { destination: "canary", weight: 10 },
        ],
      };

      await controller.patchWeights("default", "checkout-vs", body);

      expect(mockIstioService.patchVirtualServiceWeights).toHaveBeenCalledWith(
        "default",
        "checkout-vs",
        body.weights,
        undefined,
      );
    });

    it("is protected by RolesGuard requiring admin role", () => {
      // Verify the guard metadata on the method.
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      // Build a minimal execution context that simulates a non-admin user.
      const mockContext = {
        getHandler: () => IstioController.prototype.patchWeights,
        getClass: () => IstioController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: "1", username: "user", roles: ["viewer"] },
          }),
        }),
      } as unknown as ExecutionContext;

      const canActivate = guard.canActivate(mockContext);
      expect(canActivate).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /peer-authentications
  // ---------------------------------------------------------------------------

  describe("listPeerAuthentications", () => {
    it("returns an array of PeerAuthentications", async () => {
      mockIstioService.getPeerAuthentications.mockResolvedValue([fakePeerAuth]);
      const result = await controller.listPeerAuthentications("default");
      expect(result).toEqual([fakePeerAuth]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /authorization-policies
  // ---------------------------------------------------------------------------

  describe("listAuthorizationPolicies", () => {
    it("returns an array of AuthorizationPolicies with security flags", async () => {
      mockIstioService.getAuthorizationPolicies.mockResolvedValue([
        fakeAuthPolicy,
      ]);
      const result = await controller.listAuthorizationPolicies("default");
      expect(result).toEqual([fakeAuthPolicy]);
      expect(result[0].hasNoRules).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /metrics/rps
  // ---------------------------------------------------------------------------

  describe("getMetricsRps", () => {
    it("returns RPS timeseries", async () => {
      mockIstioMetricsService.getServiceRps.mockResolvedValue(fakeRps);
      const result = await controller.getMetricsRps(
        "checkout",
        "default",
        "5m",
      );
      expect(result).toEqual(fakeRps);
      expect(mockIstioMetricsService.getServiceRps).toHaveBeenCalledWith(
        "checkout",
        "default",
        "5m",
      );
    });

    it("uses 5m as the default range", async () => {
      mockIstioMetricsService.getServiceRps.mockResolvedValue(fakeRps);
      await controller.getMetricsRps("svc", "ns");
      expect(mockIstioMetricsService.getServiceRps).toHaveBeenCalledWith(
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
      mockIstioMetricsService.getServiceErrorRate.mockResolvedValue(fakeRps);
      const result = await controller.getMetricsErrorRate("svc", "ns", "1h");
      expect(result).toEqual(fakeRps);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /metrics/latency
  // ---------------------------------------------------------------------------

  describe("getMetricsLatency", () => {
    it("returns P50/P95/P99 latency", async () => {
      mockIstioMetricsService.getServiceLatency.mockResolvedValue(fakeLatency);
      const result = await controller.getMetricsLatency("svc", "ns", "5m");
      expect(result).toEqual(fakeLatency);
      expect(result.p50).toBeDefined();
      expect(result.p95).toBeDefined();
      expect(result.p99).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /topology
  // ---------------------------------------------------------------------------

  describe("getTopology", () => {
    it("returns topology edges", async () => {
      mockIstioService.buildTopology.mockResolvedValue([fakeEdge]);
      const result = await controller.getTopology("org-123");
      expect(result).toEqual([fakeEdge]);
      expect(mockIstioService.buildTopology).toHaveBeenCalledWith(
        "org-123",
        undefined,
      );
    });

    it("returns empty array when no topology is available", async () => {
      mockIstioService.buildTopology.mockResolvedValue([]);
      const result = await controller.getTopology("org-123");
      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// IstioController — additional branch coverage
// ---------------------------------------------------------------------------

describe("IstioController — additional branch coverage", () => {
  let controller: IstioController;
  let mockIstioService: Record<string, jest.Mock>;
  let mockIstioMetricsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockIstioService = {
      isIstioEnabled: jest.fn().mockResolvedValue(false),
      getVirtualServices: jest.fn().mockResolvedValue([]),
      getVirtualService: jest.fn().mockResolvedValue({}),
      patchVirtualServiceWeights: jest.fn().mockResolvedValue(undefined),
      getPeerAuthentications: jest.fn().mockResolvedValue([]),
      getAuthorizationPolicies: jest.fn().mockResolvedValue([]),
      buildTopology: jest.fn().mockResolvedValue([]),
    };

    mockIstioMetricsService = {
      getServiceRps: jest.fn().mockResolvedValue({ data: [] }),
      getServiceErrorRate: jest.fn().mockResolvedValue({ data: [] }),
      getServiceLatency: jest
        .fn()
        .mockResolvedValue({ p50: [], p95: [], p99: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IstioController],
      providers: [
        { provide: IstioService, useValue: mockIstioService },
        { provide: IstioMetricsService, useValue: mockIstioMetricsService },
      ],
    }).compile();

    controller = module.get<IstioController>(IstioController);
    jest.clearAllMocks();
  });

  describe("listVirtualServices — namespace ?? 'default' branch", () => {
    it("should use 'default' when namespace is undefined", async () => {
      await controller.listVirtualServices(undefined as unknown as string);
      expect(mockIstioService.getVirtualServices).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });

    it("should use provided namespace", async () => {
      await controller.listVirtualServices("prod");
      expect(mockIstioService.getVirtualServices).toHaveBeenCalledWith(
        "prod",
        undefined,
      );
    });
  });

  describe("listPeerAuthentications — namespace ?? 'default' branch", () => {
    it("should use 'default' when namespace is undefined", async () => {
      await controller.listPeerAuthentications(undefined as unknown as string);
      expect(mockIstioService.getPeerAuthentications).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });
  });

  describe("listAuthorizationPolicies — namespace ?? 'default' branch", () => {
    it("should use 'default' when namespace is undefined", async () => {
      await controller.listAuthorizationPolicies(
        undefined as unknown as string,
      );
      expect(mockIstioService.getAuthorizationPolicies).toHaveBeenCalledWith(
        "default",
        undefined,
      );
    });
  });

  describe("getTopology — orgId ?? '' branch", () => {
    it("should use empty string when orgId is undefined", async () => {
      await controller.getTopology(undefined as unknown as string);
      expect(mockIstioService.buildTopology).toHaveBeenCalledWith(
        "",
        undefined,
      );
    });
  });

  describe("getMetricsRps — default range", () => {
    it("should use default range=5m when not provided", async () => {
      await controller.getMetricsRps("my-svc", "default");
      expect(mockIstioMetricsService.getServiceRps).toHaveBeenCalledWith(
        "my-svc",
        "default",
        "5m",
      );
    });
  });

  describe("getMetricsErrorRate — default range", () => {
    it("should use default range=5m when not provided", async () => {
      await controller.getMetricsErrorRate("my-svc", "default");
      expect(mockIstioMetricsService.getServiceErrorRate).toHaveBeenCalledWith(
        "my-svc",
        "default",
        "5m",
      );
    });
  });

  describe("getMetricsLatency — default range", () => {
    it("should use default range=5m when not provided", async () => {
      await controller.getMetricsLatency("my-svc", "default");
      expect(mockIstioMetricsService.getServiceLatency).toHaveBeenCalledWith(
        "my-svc",
        "default",
        "5m",
      );
    });
  });

  describe("getAvailability", () => {
    it("returns available: true when Istio is enabled", async () => {
      mockIstioService.isIstioEnabled.mockResolvedValue(true);
      const result = await controller.getAvailability();
      expect(result).toEqual({ available: true });
    });

    it("returns available: false with reason when Istio is not detected", async () => {
      mockIstioService.isIstioEnabled.mockResolvedValue(false);
      const result = await controller.getAvailability();
      expect(result).toEqual({
        available: false,
        reason: "Istio not detected in cluster",
      });
    });
  });
});
