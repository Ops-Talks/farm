/**
 * Cross-tenant security tests (e2e).
 *
 * Verifies that resources created by one organization are not accessible
 * by a different organization. All scoped GET /:id endpoints must return
 * 404 when the requesting user belongs to a different organization, even
 * if the resource exists — intentional information hiding to avoid leaking
 * cross-tenant resource existence.
 */
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

describe("Cross-tenant security (e2e)", () => {
  let app: INestApplication<App>;

  // Org A — resource owner
  let tokenA: string;
  let orgA: string;

  // Org B — attacker
  let tokenB: string;
  let orgB: string;

  beforeAll(async () => {
    // Raise throttle limit so the suite can make many requests without 429/403.
    process.env.THROTTLE_LIMIT = "1000";

    app = await createE2EApp();

    ({ token: tokenA, organizationId: orgA } = await registerAndLogin(app, {
      username: "tenant-a",
      email: "tenant-a@example.com",
      password: "TenantAPass1",
      displayName: "Tenant A",
    }));

    ({ token: tokenB, organizationId: orgB } = await registerAndLogin(app, {
      username: "tenant-b",
      email: "tenant-b@example.com",
      password: "TenantBPass1",
      displayName: "Tenant B",
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper — org A creates a resource and returns its id.
  async function createCatalogComponent(name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${tokenA}`)
      .set("X-Organization-Id", orgA)
      .send({ name, kind: "service", owner: "platform" })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  describe("Catalog components", () => {
    let componentId: string;

    beforeAll(async () => {
      componentId = await createCatalogComponent("cross-tenant-catalog");
    });

    it("org A can read its own component", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/catalog/components/${componentId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A component", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/catalog/components/${componentId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });

  describe("Pipelines", () => {
    let pipelineId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/pipelines")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .send({ name: "cross-tenant-pipeline" })
        .expect(201);
      pipelineId = (res.body as { id: string }).id;
    });

    it("org A can read its own pipeline", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/pipelines/${pipelineId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A pipeline", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/pipelines/${pipelineId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });

  describe("Environments", () => {
    let envId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/environments")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .send({ name: "cross-tenant-env", type: "staging" })
        .expect(201);
      envId = (res.body as { id: string }).id;
    });

    it("org A can read its own environment", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/environments/${envId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A environment", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/environments/${envId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });

  describe("SLOs", () => {
    let sloId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/slos")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .send({
          name: "cross-tenant-slo",
          targetPercent: 99.9,
          metricType: "availability",
          window: "30d",
          organizationId: orgA,
        })
        .expect(201);
      sloId = (res.body as { id: string }).id;
    });

    it("org A can read its own SLO", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/slos/${sloId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A SLO", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/slos/${sloId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });

  describe("Incidents", () => {
    let incidentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/incidents")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .send({
          title: "Cross-tenant incident test",
          description: "Security test incident",
          severity: "P3",
        })
        .expect(201);
      incidentId = (res.body as { id: string }).id;
    });

    it("org A can read its own incident", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/incidents/${incidentId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A incident", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/incidents/${incidentId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });

  describe("Dashboards", () => {
    let dashboardId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/dashboards")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .send({ name: "Cross-tenant Dashboard", visibility: "private" })
        .expect(201);
      dashboardId = (res.body as { id: string }).id;
    });

    it("org A can read its own dashboard", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/dashboards/${dashboardId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A dashboard", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/dashboards/${dashboardId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });

  describe("Documentation", () => {
    let docId: string;
    let componentId: string;

    beforeAll(async () => {
      componentId = await createCatalogComponent("cross-tenant-docs-comp");

      const res = await request(app.getHttpServer())
        .post("/api/v1/docs")
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .send({
          title: "Cross-tenant Doc",
          sourceUrl: "https://raw.example.com/cross-tenant.md",
          componentId,
          author: "security-test",
          version: "1.0.0",
        })
        .expect(201);
      docId = (res.body as { id: string }).id;
    });

    it("org A can read its own documentation", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/docs/${docId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .set("X-Organization-Id", orgA)
        .expect(200);
    });

    it("org B receives 404 for org A documentation", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/docs/${docId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .set("X-Organization-Id", orgB)
        .expect(404);
    });
  });
});
