import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * E2E tests for the KEDA Autoscaling Visibility endpoints (FARM-S252 / FARM-S253).
 *
 * These tests run against an in-memory SQLite database with no real Kubernetes
 * cluster configured. The KubernetesService disables itself gracefully in that
 * scenario, so every endpoint returns safe empty/not-installed defaults.
 */
describe("Kubernetes KEDA (e2e)", () => {
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

  it("GET /api/v1/kubernetes/keda/status — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/status")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/keda/scaled-objects — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/scaled-objects")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/keda/scaled-jobs — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/scaled-jobs")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/keda/scaled-objects/default/my-app/triggers — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/scaled-objects/default/my-app/triggers")
      .expect(401);
  });

  it("POST /api/v1/kubernetes/keda/binding — 401 without token", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/kubernetes/keda/binding")
      .send({
        scaledObjectName: "my-scaler",
        scaledObjectNamespace: "default",
        componentId: "comp-uuid-1",
      })
      .expect(401);
  });

  it("DELETE /api/v1/kubernetes/keda/binding/some-id — 401 without token", async () => {
    await request(app.getHttpServer())
      .delete("/api/v1/kubernetes/keda/binding/some-id")
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // KEDA status (no cluster → not-installed defaults)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/keda/status — returns not-installed when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/status")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      installed: false,
      version: "",
    });
  });

  // ---------------------------------------------------------------------------
  // KEDA ScaledObjects (no cluster → empty array)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/keda/scaled-objects — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/scaled-objects")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // KEDA ScaledJobs (no cluster → empty array)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/keda/scaled-jobs — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/scaled-jobs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // KEDA ScaledObject triggers (no cluster → empty array)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/keda/scaled-objects/default/my-app/triggers — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/keda/scaled-objects/default/my-app/triggers")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });
});
