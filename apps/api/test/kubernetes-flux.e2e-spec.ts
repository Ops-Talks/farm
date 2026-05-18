import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * E2E tests for the Flux GitOps endpoints (FARM-S248 / FARM-S249 / FARM-S250).
 *
 * These tests run against an in-memory SQLite database with no real Kubernetes
 * cluster configured. KubernetesService disables itself gracefully in that
 * scenario, so every read endpoint returns safe empty/not-installed defaults.
 * Write endpoints (POST /flux/binding) return 503 because FluxBindingService
 * is not provisioned when Kubernetes is disconnected — guarded by @Optional().
 */
describe("Kubernetes Flux GitOps (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    const auth = await registerAndLogin(app, {
      username: "flux-e2e-user",
      email: "flux-e2e@test.com",
    });
    token = auth.token;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Authentication guard — FARM-S248
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/status — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/status")
      .expect(401);
  });

  it("GET /api/v1/kubernetes/flux/kustomizations — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/kustomizations")
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // Authentication guard — FARM-S249
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/helm-releases — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/helm-releases")
      .expect(401);
  });

  it("POST /api/v1/kubernetes/flux/binding — 401 without token", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/kubernetes/flux/binding")
      .send({
        resourceKind: "Kustomization",
        resourceName: "my-app",
        resourceNamespace: "flux-system",
        componentId: "550e8400-e29b-41d4-a716-446655440001",
      })
      .expect(401);
  });

  it("DELETE /api/v1/kubernetes/flux/binding/:id — 401 without token", async () => {
    await request(app.getHttpServer())
      .delete("/api/v1/kubernetes/flux/binding/some-uuid")
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // Authentication guard — FARM-S250
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/sources — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/sources")
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // Flux status (FARM-S248)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/status — returns not-installed when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/status")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect(res.body).toMatchObject({
      installed: false,
      controllers: [],
    });
  });

  // ---------------------------------------------------------------------------
  // Flux Kustomizations (FARM-S248)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/kustomizations — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/kustomizations")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Flux HelmReleases (FARM-S249)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/helm-releases — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/helm-releases")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Flux Sources (FARM-S250)
  // ---------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/flux/sources — returns empty array when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/flux/sources")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Flux Binding happy-path (FARM-S249)
  // ---------------------------------------------------------------------------

  it("POST /api/v1/kubernetes/flux/binding — creates a binding and DELETE removes it", async () => {
    // Create a catalog component to use as the FK target.
    const compRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "flux-e2e-component",
        kind: "service",
        owner: "platform-team",
      })
      .expect(201);

    const componentId = (compRes.body as { id: string }).id;

    // Create the Flux binding.
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/kubernetes/flux/binding")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        resourceKind: "Kustomization",
        resourceName: "my-app",
        resourceNamespace: "flux-system",
        componentId,
      })
      .expect(201);

    expect(createRes.body).toMatchObject({
      resourceKind: "Kustomization",
      resourceName: "my-app",
      resourceNamespace: "flux-system",
      componentId,
    });
    expect(typeof (createRes.body as { id: string }).id).toBe("string");

    const bindingId = (createRes.body as { id: string }).id;

    // Remove the binding.
    await request(app.getHttpServer())
      .delete(`/api/v1/kubernetes/flux/binding/${bindingId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);
  });
});
