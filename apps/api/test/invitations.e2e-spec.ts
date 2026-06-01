import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { OrgRole } from "@farm/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { User } from "../src/modules/auth/entities/user.entity";

describe("Invitations (Phase 37) (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    const ctx = await registerAndLogin(app, {
      username: "inv_admin",
      email: "inv_admin@e2e.com",
    });
    adminToken = ctx.token;
    organizationId = ctx.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an invitation, previews and accepts it", async () => {
    const inviteeEmail = "invitee@e2e.com";
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        organizationId,
        emails: [inviteeEmail],
        role: OrgRole.MEMBER,
      })
      .expect(201);

    const created = createRes.body as Array<{ token: string; id: string }>;
    expect(created).toHaveLength(1);
    expect(created[0].token).toBeDefined();

    // Public preview
    const previewRes = await request(app.getHttpServer())
      .get(`/api/v1/invitations/by-token/${created[0].token}`)
      .expect(200);
    const preview = previewRes.body as { role: string; orgName: string };
    expect(preview.role).toBeDefined();
    expect(preview.orgName).toBeDefined();

    // Create the invitee user account directly via repository
    const inviteeRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await inviteeRepo.save(
      inviteeRepo.create({
        username: "invitee",
        email: inviteeEmail,
        password: "Strongest1",
        displayName: "Invitee",
        roles: ["user"],
      }),
    );

    // Accept
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/invitations/by-token/${created[0].token}/accept`)
      .expect(200);
    const acceptBody = acceptRes.body as { organizationId: string };
    expect(acceptBody.organizationId).toBe(organizationId);
  });

  it("rejects invitation creation by unauthenticated request", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/invitations")
      .send({
        organizationId,
        emails: ["x@e2e.com"],
        role: OrgRole.MEMBER,
      })
      .expect(401);
  });

  it("returns 404 for unknown token preview", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/invitations/by-token/does-not-exist")
      .expect(404);
  });
});
