import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * E2E tests for the Dragonfly P2P CDN endpoints (FARM-S245 / FARM-S246).
 *
 * These tests run against an in-memory SQLite database with no real Kubernetes
 * cluster configured. The KubernetesService disables itself gracefully in that
 * scenario, so every endpoint returns safe empty/not-installed defaults.
 */
describe("Kubernetes Dragonfly (e2e)", () => {
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

  // ---------------------------------------------------------------------------
  // Authentication guard
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/dragonfly/status — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/status")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/dragonfly/metrics — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/metrics")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/dragonfly/tasks — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/tasks")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/dragonfly/peers — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/peers")
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // Dragonfly status
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/dragonfly/status — returns not-installed when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/status")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      status: "not-installed",
      version: null,
      components: [],
    });
  });

  // ---------------------------------------------------------------------------
  // Dragonfly metrics
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/dragonfly/metrics — returns zero metrics when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/metrics")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      totalTasks: 0,
      succeededTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      totalPeers: 0,
    });
  });

  // ---------------------------------------------------------------------------
  // Dragonfly tasks
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/dragonfly/tasks — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/tasks")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Dragonfly peers
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/dragonfly/peers — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/dragonfly/peers")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });
});
