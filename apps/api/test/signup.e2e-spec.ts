import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp } from "./helpers/e2e-setup";

describe("Signup (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2EApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a new user successfully", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "signup_user",
        email: "signup@example.com",
        password: "Strongest1",
        displayName: "Signup User",
      })
      .expect(201);
    const body = res.body as { username: string };
    expect(body.username).toBe("signup_user");
  });

  it("returns 409 on duplicate username", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "dupe_user",
        email: "dupe1@example.com",
        password: "Strongest1",
        displayName: "Dupe",
      })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "dupe_user",
        email: "dupe2@example.com",
        password: "Strongest1",
        displayName: "Dupe",
      })
      .expect(409);
  });

  it("returns 400 for invalid username characters", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "with space",
        email: "bad@example.com",
        password: "Strongest1",
        displayName: "Bad",
      })
      .expect(400);
  });
});
