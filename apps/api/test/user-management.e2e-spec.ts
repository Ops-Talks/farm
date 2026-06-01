import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

describe("User Management (Phase 37) (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    const ctx = await registerAndLogin(app, {
      username: "um_admin",
      email: "um_admin@e2e.com",
    });
    adminToken = ctx.token;

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "um_target",
        email: "um_target@e2e.com",
        password: "Strongest1",
        displayName: "Target",
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const listBody = list.body as {
      users: Array<{ id: string; username: string }>;
    };
    targetUserId = listBody.users.find((u) => u.username === "um_target")!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists users for platform admin", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as { total: number };
    expect(body.total).toBeGreaterThanOrEqual(2);
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).get("/api/v1/users").expect(401);
  });

  it("resets a user's password and returns fallback temp password when SMTP disabled", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/users/${targetUserId}/reset-password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as { tempPassword?: string };
    expect(body.tempPassword).toBeDefined();
  });

  it("suspends a user and prevents them from logging in", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetUserId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspended: true })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "um_target", password: "Strongest1" })
      .expect(401);
  });

  it("blocks self-suspend", async () => {
    const me = await request(app.getHttpServer())
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const meBody = me.body as {
      users: Array<{ id: string; username: string }>;
    };
    const selfId = meBody.users.find((u) => u.username === "um_admin")!.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${selfId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ suspended: true })
      .expect(400);
  });

  describe("POST /api/v1/users (Phase 56 — admin user creation)", () => {
    const validDto = {
      username: "um_created",
      email: "um_created@e2e.com",
      displayName: "Created User",
    };

    it("creates a user as platform admin → 201 with id, username, email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validDto)
        .expect(201);
      const body = res.body as { id: string; username: string; email: string };
      expect(body.id).toBeDefined();
      expect(body.username).toBe(validDto.username);
      expect(body.email).toBe(validDto.email);
    });

    it("duplicate username → 409", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validDto)
        .expect(409);
    });

    it("duplicate email with different username → 409", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validDto, username: "um_created2" })
        .expect(409);
    });

    it("no JWT → 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/users")
        .send(validDto)
        .expect(401);
    });

    it("non-admin user → 403", async () => {
      // Register a non-admin user and get their token
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          username: "um_nonadmin",
          email: "um_nonadmin@e2e.com",
          password: "Strongest1",
          displayName: "Non Admin",
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ username: "um_nonadmin", password: "Strongest1" })
        .expect(200);
      const nonAdminToken = (loginRes.body as { token: string }).token;

      await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${nonAdminToken}`)
        .send({
          username: "um_new99",
          email: "new99@e2e.com",
          displayName: "New",
        })
        .expect(403);
    });
  });
});
