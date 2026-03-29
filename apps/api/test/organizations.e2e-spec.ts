import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface InvitationResponse {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * E2E tests for the organization invitation flow (FARM-E50 S199).
 * Uses an in-memory SQLite database — no SMTP or Redis required.
 */
describe("Organization Invitations (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token: adminToken, organizationId } = await registerAndLogin(app));
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/organizations/:id/invitations
  // ---------------------------------------------------------------------------

  describe("POST /organizations/:id/invitations", () => {
    it("should create an invitation and return 201 with the invitation object (no tokenHash)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "newmember@example.com", role: "member" })
        .expect(201);

      const body = res.body as InvitationResponse;
      expect(body.id).toBeDefined();
      expect(body.organizationId).toBe(organizationId);
      expect(body.email).toBe("newmember@example.com");
      expect(body.role).toBe("member");
      expect(body.status).toBe("pending");
      expect(body.expiresAt).toBeDefined();
      expect(body.createdAt).toBeDefined();
      // Plain token and hash must NEVER be in the response
      expect((body as Record<string, unknown>)["tokenHash"]).toBeUndefined();
      expect((body as Record<string, unknown>)["token"]).toBeUndefined();
    });

    it("should return 409 when a pending invitation for the same email already exists", async () => {
      // First invitation (may already exist from the previous test; send again)
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "duplicate@example.com", role: "member" });

      // Second invitation for the same email
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "duplicate@example.com", role: "member" })
        .expect(409);
    });

    it("should return 400 when the email address is invalid", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "not-an-email", role: "member" })
        .expect(400);
    });

    it("should return 401 when no authentication token is provided", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .send({ email: "anon@example.com" })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/organizations/:id/invitations
  // ---------------------------------------------------------------------------

  describe("GET /organizations/:id/invitations", () => {
    it("should return 200 with an array of pending invitations", async () => {
      // Ensure at least one invitation exists
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "listed@example.com", role: "admin" });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as InvitationResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      // All returned invitations should be pending
      body.forEach((inv) => {
        expect(inv.status).toBe("pending");
        expect((inv as Record<string, unknown>)["tokenHash"]).toBeUndefined();
      });
    });

    it("should return 401 when no authentication token is provided", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/invitations`)
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/v1/organizations/:id/invitations/:invitationId
  // ---------------------------------------------------------------------------

  describe("DELETE /organizations/:id/invitations/:invitationId", () => {
    it("should cancel an invitation and return 204", async () => {
      // Create a fresh invitation to cancel
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "tocancel@example.com", role: "member" })
        .expect(201);

      const { id: invitationId } = createRes.body as { id: string };

      await request(app.getHttpServer())
        .delete(
          `/api/v1/organizations/${organizationId}/invitations/${invitationId}`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);
    });

    it("should return 404 for a non-existent invitation", async () => {
      await request(app.getHttpServer())
        .delete(
          `/api/v1/organizations/${organizationId}/invitations/00000000-0000-0000-0000-000000000000`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("should return 400 when attempting to cancel an already cancelled invitation", async () => {
      // Create and immediately cancel
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "alreadycancelled@example.com", role: "member" })
        .expect(201);

      const { id: invitationId } = createRes.body as { id: string };

      await request(app.getHttpServer())
        .delete(
          `/api/v1/organizations/${organizationId}/invitations/${invitationId}`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);

      // Second cancel attempt should fail
      await request(app.getHttpServer())
        .delete(
          `/api/v1/organizations/${organizationId}/invitations/${invitationId}`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/invitations/:token/accept
  // ---------------------------------------------------------------------------

  describe("POST /invitations/:token/accept", () => {
    it("should return 404 for an invalid or unknown token", async () => {
      // Register a second user for acceptance
      await request(app.getHttpServer()).post("/api/v1/auth/register").send({
        username: "acceptor-user",
        email: "acceptor@e2e-test.com",
        password: "TestPassword1",
        displayName: "Acceptor",
      });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ username: "acceptor-user", password: "TestPassword1" })
        .expect(200);

      const acceptorToken = (loginRes.body as { token: string }).token;

      await request(app.getHttpServer())
        .post(
          "/api/v1/invitations/invalid-bad-token-that-does-not-exist/accept",
        )
        .set("Authorization", `Bearer ${acceptorToken}`)
        .expect(404);
    });

    it("should return 401 when no authentication token is provided", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/invitations/some-token/accept")
        .expect(401);
    });
  });
});
