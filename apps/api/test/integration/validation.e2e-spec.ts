import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "../helpers/e2e-setup";

describe("ValidationPipe - query param type safety", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    const auth = await registerAndLogin(app);
    token = auth.token;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/catalog/components", () => {
    it("should return 400 when skip is not a number", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/catalog/components?skip=abc")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(400);
    });

    it("should return 400 when take is not a number", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/catalog/components?take=xyz")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(400);
    });

    it("should return 400 when take exceeds max allowed value", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/catalog/components?take=999")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(400);
    });

    it("should accept valid skip=0 and take=20", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/catalog/components?skip=0&take=20")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);
    });
  });
});
