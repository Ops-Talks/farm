import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { IstioService } from "../src/modules/istio/istio.service";
import { IstioMetricsService } from "../src/modules/istio/istio-metrics.service";
import { User } from "../src/modules/auth/entities/user.entity";

/**
 * E2E tests for the Istio service mesh integration module.
 *
 * Uses an in-memory SQLite database via createE2EApp() and overrides
 * IstioService + IstioMetricsService with lightweight mocks so the tests
 * run without a real Kubernetes cluster or Prometheus instance.
 */
describe("Istio (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let adminToken: string;
  let adminOrganizationId: string;
  let viewerOrganizationId: string;

  // ---------------------------------------------------------------------------
  // Mock service implementations
  // ---------------------------------------------------------------------------

  const mockIstioService: Partial<IstioService> = {
    isIstioEnabled: jest.fn().mockResolvedValue(true),
    getVirtualServices: jest.fn().mockResolvedValue([
      {
        name: "checkout-vs",
        namespace: "default",
        hosts: ["checkout"],
        gateways: [],
        http: [{ route: [{ destination: "stable", weight: 100 }] }],
        labels: {},
      },
    ]),
    getVirtualService: jest.fn().mockResolvedValue({
      name: "checkout-vs",
      namespace: "default",
      hosts: ["checkout"],
      gateways: [],
      http: [{ route: [{ destination: "stable", weight: 100 }] }],
      labels: {},
    }),
    patchVirtualServiceWeights: jest.fn().mockResolvedValue(undefined),
    getPeerAuthentications: jest.fn().mockResolvedValue([
      {
        name: "default-pa",
        namespace: "default",
        selector: {},
        mtlsMode: "STRICT",
      },
    ]),
    getAuthorizationPolicies: jest.fn().mockResolvedValue([
      {
        name: "allow-policy",
        namespace: "default",
        selector: {},
        action: "ALLOW",
        rules: [{ principals: ["cluster.local/ns/default/sa/client"] }],
        hasNoRules: false,
      },
    ]),
    buildTopology: jest.fn().mockResolvedValue([
      {
        source: "checkout",
        destination: "payment",
        weight: 80,
        namespace: "default",
      },
    ]),
  };

  const mockIstioMetricsService: Partial<IstioMetricsService> = {
    getServiceRps: jest.fn().mockResolvedValue({
      timeseries: [],
      query: "rate(istio_requests_total{}[5m])",
    }),
    getServiceErrorRate: jest.fn().mockResolvedValue({
      timeseries: [],
      query: "sum(rate(istio_requests_total{response_code=~'5..'}[5m]))",
    }),
    getServiceLatency: jest.fn().mockResolvedValue({
      p50: { timeseries: [], query: "p50" },
      p95: { timeseries: [], query: "p95" },
      p99: { timeseries: [], query: "p99" },
    }),
  };

  // ---------------------------------------------------------------------------
  // Setup / teardown
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    app = await createE2EApp();

    // Override Istio providers with mocks after the app is compiled.
    const istioService = app.get(IstioService);
    Object.assign(istioService, mockIstioService);

    const istioMetricsService = app.get(IstioMetricsService);
    Object.assign(istioMetricsService, mockIstioMetricsService);

    ({ token: adminToken, organizationId: adminOrganizationId } =
      await registerAndLogin(app));

    // Register a second non-admin user for authorization tests.
    ({ token, organizationId: viewerOrganizationId } = await registerAndLogin(
      app,
      {
        username: "istio-viewer",
        email: "istio-viewer@e2e-test.com",
        password: "TestPassword1",
        displayName: "Istio Viewer",
      },
    ));

    // Remove admin role from the viewer user by re-logging in without role promotion.
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepo.update({ username: "istio-viewer" }, { roles: ["viewer"] });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "istio-viewer", password: "TestPassword1" })
      .expect(200);
    token = (loginRes.body as { token: string }).token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/status
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/status", () => {
    it("returns 200 with istioEnabled boolean", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("istioEnabled");
      expect(typeof (res.body as { istioEnabled: unknown }).istioEnabled).toBe(
        "boolean",
      );
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/istio/status")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/virtual-services
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/virtual-services", () => {
    it("returns 200 with an array of VirtualServices", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/virtual-services?namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Array<Record<string, unknown>>;
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("hosts");
      expect(body[0]).toHaveProperty("http");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/istio/virtual-services?namespace=default")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/virtual-services/:namespace/:name
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/virtual-services/:namespace/:name", () => {
    it("returns 200 with a single VirtualService", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/virtual-services/default/checkout-vs")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("name", "checkout-vs");
      expect(res.body).toHaveProperty("namespace", "default");
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/v1/istio/virtual-services/:namespace/:name/weights
  // ---------------------------------------------------------------------------

  describe("PATCH /api/v1/istio/virtual-services/:namespace/:name/weights", () => {
    const validBody = {
      weights: [
        { destination: "stable", weight: 90 },
        { destination: "canary", weight: 10 },
      ],
    };

    it("returns 204 when admin patches weights", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/istio/virtual-services/default/checkout-vs/weights")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .send(validBody)
        .expect(204);
    });

    it("returns 403 when a non-admin user attempts to patch weights", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/istio/virtual-services/default/checkout-vs/weights")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", viewerOrganizationId)
        .send(validBody)
        .expect(403);
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/istio/virtual-services/default/checkout-vs/weights")
        .send(validBody)
        .expect(401);
    });

    it("returns 400 for an invalid request body", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/istio/virtual-services/default/checkout-vs/weights")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .send({ weights: [{ destination: 123, weight: "not-a-number" }] })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/peer-authentications
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/peer-authentications", () => {
    it("returns 200 with an array of PeerAuthentications", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/peer-authentications?namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as Array<Record<string, unknown>>)[0]).toHaveProperty(
        "mtlsMode",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/authorization-policies
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/authorization-policies", () => {
    it("returns 200 with an array of AuthorizationPolicies", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/authorization-policies?namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const authPolicies = res.body as Array<Record<string, unknown>>;
      expect(authPolicies[0]).toHaveProperty("action");
      expect(authPolicies[0]).toHaveProperty("hasNoRules");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/metrics/rps
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/metrics/rps", () => {
    it("returns 200 with timeseries and query fields", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/metrics/rps?service=checkout&namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("timeseries");
      expect(res.body).toHaveProperty("query");
      expect(
        Array.isArray((res.body as { timeseries: unknown[] }).timeseries),
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/metrics/error-rate
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/metrics/error-rate", () => {
    it("returns 200 with timeseries and query fields", async () => {
      const res = await request(app.getHttpServer())
        .get(
          "/api/v1/istio/metrics/error-rate?service=checkout&namespace=default",
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("timeseries");
      expect(res.body).toHaveProperty("query");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/metrics/latency
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/metrics/latency", () => {
    it("returns 200 with p50, p95, and p99 fields", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/metrics/latency?service=checkout&namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("p50");
      expect(res.body).toHaveProperty("p95");
      expect(res.body).toHaveProperty("p99");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/istio/topology
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/istio/topology", () => {
    it("returns 200 with an array of topology edges", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/istio/topology?orgId=org-123")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const edges = res.body as Array<Record<string, unknown>>;
      expect(edges[0]).toHaveProperty("source");
      expect(edges[0]).toHaveProperty("destination");
      expect(edges[0]).toHaveProperty("weight");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/istio/topology?orgId=org-123")
        .expect(401);
    });
  });
});
