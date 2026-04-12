import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { LinkerdService } from "../src/modules/linkerd/linkerd.service";
import { LinkerdMetricsService } from "../src/modules/linkerd/linkerd-metrics.service";

/**
 * E2E tests for the Linkerd 2.x service mesh integration module.
 *
 * Uses an in-memory SQLite database via createE2EApp() and overrides
 * LinkerdService + LinkerdMetricsService with lightweight mocks so the tests
 * run without a real Kubernetes cluster or Prometheus instance.
 */
describe("Linkerd (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let adminOrganizationId: string;

  // ---------------------------------------------------------------------------
  // Mock service implementations
  // ---------------------------------------------------------------------------

  const mockLinkerdService: Partial<LinkerdService> = {
    isLinkerdEnabled: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({
      installed: true,
      components: [
        { name: "linkerd-controller", ready: true, version: "stable-2.14.0" },
        { name: "linkerd-identity", ready: true, version: "stable-2.14.0" },
      ],
    }),
    listServerAuthorizations: jest.fn().mockResolvedValue([
      {
        name: "sa-allow-all",
        namespace: "default",
        server: "my-server",
        clients: ["default/client-sa"],
      },
    ]),
    listAuthorizationPolicies: jest.fn().mockResolvedValue([
      {
        name: "policy-1",
        namespace: "default",
        targetRef: { kind: "Server", name: "my-server" },
        requiredAuthenticationRefs: [
          { name: "my-auth", kind: "MeshTLSAuthentication" },
        ],
      },
    ]),
    listServiceProfiles: jest.fn().mockResolvedValue([
      {
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
      },
    ]),
  };

  const mockLinkerdMetricsService: Partial<LinkerdMetricsService> = {
    getServiceRps: jest.fn().mockResolvedValue({
      timeseries: [],
      query: "rate(request_total{}[5m])",
    }),
    getServiceErrorRate: jest.fn().mockResolvedValue({
      timeseries: [],
      query: 'rate(request_total{classification="failure"}[5m])',
    }),
    getServiceLatency: jest.fn().mockResolvedValue({
      p50: { timeseries: [], query: "p50" },
      p95: { timeseries: [], query: "p95" },
      p99: { timeseries: [], query: "p99" },
    }),
    buildTopology: jest.fn().mockResolvedValue([
      {
        source: "frontend",
        destination: "backend",
        namespace: "default",
        rps: 1.5,
      },
    ]),
  };

  // ---------------------------------------------------------------------------
  // Setup / teardown
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    app = await createE2EApp();

    const linkerdService = app.get(LinkerdService);
    Object.assign(linkerdService, mockLinkerdService);

    const linkerdMetricsService = app.get(LinkerdMetricsService);
    Object.assign(linkerdMetricsService, mockLinkerdMetricsService);

    ({ token: adminToken, organizationId: adminOrganizationId } =
      await registerAndLogin(app));
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/status
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/status", () => {
    it("returns 200 with installed flag and components array", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/linkerd/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("installed", true);
      expect(
        Array.isArray((res.body as { components: unknown[] }).components),
      ).toBe(true);
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/status")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/server-authorizations
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/server-authorizations", () => {
    it("returns 200 with an array of ServerAuthorizations", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/linkerd/server-authorizations?namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Array<Record<string, unknown>>;
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("server");
      expect(body[0]).toHaveProperty("clients");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/server-authorizations?namespace=default")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/authorization-policies
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/authorization-policies", () => {
    it("returns 200 with an array of AuthorizationPolicies", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/linkerd/authorization-policies?namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Array<Record<string, unknown>>;
      expect(body[0]).toHaveProperty("targetRef");
      expect(body[0]).toHaveProperty("requiredAuthenticationRefs");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/authorization-policies?namespace=default")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/service-profiles
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/service-profiles", () => {
    it("returns 200 with an array of ServiceProfiles", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/linkerd/service-profiles?namespace=default")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Array<Record<string, unknown>>;
      expect(body[0]).toHaveProperty("routes");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/service-profiles?namespace=default")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/metrics/rps
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/metrics/rps", () => {
    it("returns 200 with timeseries data", async () => {
      const res = await request(app.getHttpServer())
        .get(
          "/api/v1/linkerd/metrics/rps?deployment=my-service&namespace=default",
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("timeseries");
      expect(res.body).toHaveProperty("query");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/metrics/rps?deployment=svc&namespace=default")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/metrics/error-rate
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/metrics/error-rate", () => {
    it("returns 200 with timeseries data", async () => {
      const res = await request(app.getHttpServer())
        .get(
          "/api/v1/linkerd/metrics/error-rate?deployment=my-service&namespace=default",
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("timeseries");
      expect(res.body).toHaveProperty("query");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/metrics/latency
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/metrics/latency", () => {
    it("returns 200 with p50/p95/p99 latency data", async () => {
      const res = await request(app.getHttpServer())
        .get(
          "/api/v1/linkerd/metrics/latency?deployment=my-service&namespace=default",
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("p50");
      expect(res.body).toHaveProperty("p95");
      expect(res.body).toHaveProperty("p99");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/metrics/latency?deployment=svc&namespace=default")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/topology
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/topology", () => {
    it("returns 200 with service topology edges", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/linkerd/topology")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Array<Record<string, unknown>>;
      expect(body[0]).toHaveProperty("source");
      expect(body[0]).toHaveProperty("destination");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/topology")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/linkerd/available
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/linkerd/available", () => {
    it("returns 200 with available: true when Linkerd is installed", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/linkerd/available")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("available", true);
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/linkerd/available")
        .expect(401);
    });
  });
});
