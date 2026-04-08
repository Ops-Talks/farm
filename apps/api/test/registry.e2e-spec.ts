import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * End-to-end tests for the Registry module REST API.
 * Uses a better-sqlite3 in-memory database; no real registry provider is
 * contacted because REGISTRY_TYPE is unset in test mode.
 */
describe("Registry (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/registry/repositories", () => {
    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories")
        .expect(401);
    });

    it("should return 503 when authenticated but no adapter is configured", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories")
        .set("Authorization", `Bearer ${token}`)
        .expect(503);
    });
  });

  describe("GET /api/v1/registry/repositories/:name/tags", () => {
    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories/my-app/tags")
        .expect(401);
    });

    it("should return 503 when authenticated but no adapter is configured", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories/my-app/tags")
        .set("Authorization", `Bearer ${token}`)
        .expect(503);
    });
  });

  describe("GET /api/v1/registry/repositories/:name/manifest/:tag", () => {
    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories/my-app/manifest/latest")
        .expect(401);
    });

    it("should return 503 when authenticated but no adapter is configured", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories/my-app/manifest/latest")
        .set("Authorization", `Bearer ${token}`)
        .expect(503);
    });
  });

  describe("GET /api/v1/registry/repositories/:name/scan/:tag", () => {
    it("should return 401 when no JWT token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories/my-app/scan/latest")
        .expect(401);
    });

    it("should return 503 when authenticated but no adapter is configured", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/repositories/my-app/scan/latest")
        .set("Authorization", `Bearer ${token}`)
        .expect(503);
    });
  });
});
