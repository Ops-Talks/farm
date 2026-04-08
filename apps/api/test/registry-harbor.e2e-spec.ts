import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * End-to-end tests for the Harbor-specific registry endpoints.
 * No Harbor instance is configured in the test environment, so the tests
 * validate graceful degradation behavior.
 */
describe("Registry Harbor (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token } = await registerAndLogin(app, {
      username: "harbor-e2e-admin",
      email: "harbor-e2e@test.com",
      password: "TestPassword1",
      displayName: "Harbor E2E Admin",
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/registry/repositories", () => {
    it("should return 401 without token", async () => {
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

  describe("GET /api/v1/registry/harbor/replications", () => {
    it("should return 401 without token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/registry/harbor/replications")
        .expect(401);
    });

    it("should return 200 with empty array when adapter is not Harbor", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/registry/harbor/replications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
