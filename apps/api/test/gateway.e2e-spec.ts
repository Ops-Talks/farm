import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * End-to-end tests for the Gateway module REST API.
 * Uses a better-sqlite3 in-memory database; no real gateway provider is
 * contacted because no adapters are enabled by default in test mode.
 */
describe("Gateway (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/gateway/routes", () => {
    it("should return 200 with an empty array when no routes are synced", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/gateway/routes")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/gateway/routes")
        .expect(401);
    });
  });

  describe("GET /api/v1/gateway/routes/:id", () => {
    it("should return 404 for a non-existent route id", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/gateway/routes/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(404);
    });
  });

  describe("POST /api/v1/gateway/sync", () => {
    it("should return 201 and sync message when called by admin", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/gateway/sync")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(201);

      expect(res.body).toEqual({ message: "Sync triggered" });
    });

    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/gateway/sync")
        .expect(401);
    });
  });

  describe("GET /api/v1/gateway/health", () => {
    it("should return 200 with an empty array when no health checks exist", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/gateway/health")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/gateway/health")
        .expect(401);
    });
  });

  describe("POST /api/v1/gateway/health/check", () => {
    it("should return 201 and health check message when called by admin", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/gateway/health/check")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(201);

      expect(res.body).toEqual({ message: "Health check triggered" });
    });

    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/gateway/health/check")
        .expect(401);
    });
  });

  describe("org context", () => {
    it("should accept X-Organization-Id header and return empty routes scoped to org", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/gateway/routes")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
