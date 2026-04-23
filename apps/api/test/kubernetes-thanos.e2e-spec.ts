import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * E2E tests for the Thanos discovery endpoint (Phase 32).
 *
 * These tests run against an in-memory SQLite database with no real Kubernetes
 * cluster or Prometheus backend configured. ThanosService degrades gracefully
 * in that scenario, so every sub-discovery method returns safe empty defaults
 * and detectMetricsBackend returns { type: "unknown" }.
 */
describe("Kubernetes Thanos (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    const auth = await registerAndLogin(app);
    token = auth.token;
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // Authentication guard
  // -------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/thanos — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/thanos")
      .expect(401);
  });

  // -------------------------------------------------------------------------
  // Happy path — no cluster configured
  // -------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/thanos — 200 with token, returns full ThanosResult structure when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/thanos")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      operator: [],
      inCluster: [],
      backendType: "unknown",
      longTermEnabled: false,
    });
  });

  // -------------------------------------------------------------------------
  // Namespace-scoped query — no cluster configured
  // -------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/thanos?namespace=monitoring — 200, returns same structure with namespace filter", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/thanos?namespace=monitoring")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      operator: [],
      inCluster: [],
      backendType: "unknown",
      longTermEnabled: false,
    });
  });
});
