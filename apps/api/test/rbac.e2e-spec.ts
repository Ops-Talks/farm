import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { UserOrganization } from "../src/modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";

/**
 * E2E test suite for RBAC (Role-Based Access Control) enforcement.
 *
 * Verifies that PermissionGuard correctly gates mutating endpoints based on
 * the caller's organization role, and that the GET :id/members/me endpoint
 * returns the authenticated user's own membership details.
 */
describe("RBAC enforcement (e2e)", () => {
  let app: INestApplication<App>;

  // Owner credentials — the default registerAndLogin user
  let ownerToken: string;
  let organizationId: string;
  let ownerId: string;

  // A second user registered as a viewer
  let viewerToken: string;
  let viewerUserId: string;

  beforeAll(async () => {
    app = await createE2EApp();

    // Register the owner
    ({ token: ownerToken, organizationId } = await registerAndLogin(app, {
      username: "rbac-owner",
      email: "rbac-owner@e2e.test",
    }));

    // Retrieve the owner user id for reference
    const result = await request(app.getHttpServer())
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    ownerId = (result.body as { id: string }).id;

    // Register a viewer user
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "rbac-viewer",
        email: "rbac-viewer@e2e.test",
        password: "TestPassword1",
        displayName: "Viewer User",
      })
      .expect(201);

    const viewerLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "rbac-viewer", password: "TestPassword1" })
      .expect(200);
    viewerToken = (viewerLogin.body as { token: string }).token;

    // Retrieve viewer user id
    const viewerMe = await request(app.getHttpServer())
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(200);
    viewerUserId = (viewerMe.body as { id: string }).id;

    // Add the viewer as a VIEWER in the org
    const userOrgRepo = app.get<Repository<UserOrganization>>(
      getRepositoryToken(UserOrganization),
    );
    const membership = userOrgRepo.create({
      userId: viewerUserId,
      organizationId,
      role: OrgRole.VIEWER,
    });
    await userOrgRepo.save(membership);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET :id/members/me
  // ---------------------------------------------------------------------------

  describe("GET /organizations/:id/members/me", () => {
    it("returns the owner's own membership", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/members/me`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        role: OrgRole.OWNER,
        userId: ownerId,
      });
    });

    it("returns the viewer's own membership", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/members/me`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        role: OrgRole.VIEWER,
        userId: viewerUserId,
      });
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/members/me`)
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Catalog — CATALOG_WRITE and CATALOG_DELETE
  // ---------------------------------------------------------------------------

  describe("Catalog permission gates", () => {
    it("viewer cannot create a catalog component (CATALOG_WRITE)", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/catalog/components")
        .set("Authorization", `Bearer ${viewerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({
          name: "viewer-component",
          kind: "service",
          owner: "viewer-team",
        })
        .expect(403);
    });

    it("owner can create a catalog component (CATALOG_WRITE)", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/catalog/components")
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({
          name: "owner-catalog-rbac-test",
          kind: "service",
          owner: "owner-team",
        })
        .expect(201);
    });
  });

  // ---------------------------------------------------------------------------
  // Pipelines — PIPELINE_TRIGGER and PIPELINE_DELETE
  // ---------------------------------------------------------------------------

  describe("Pipeline permission gates", () => {
    let pipelineId: string;

    beforeAll(async () => {
      // Owner creates a pipeline for trigger/delete tests
      const res = await request(app.getHttpServer())
        .post("/api/v1/pipelines")
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({ name: "rbac-test-pipeline", stages: [] })
        .expect(201);
      pipelineId = (res.body as { id: string }).id;
    });

    it("viewer cannot trigger a pipeline (PIPELINE_TRIGGER)", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/pipelines/${pipelineId}/trigger`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({})
        .expect(403);
    });

    it("viewer cannot delete a pipeline (PIPELINE_DELETE)", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/pipelines/${pipelineId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .set("X-Organization-Id", organizationId)
        .expect(403);
    });

    it("owner can trigger a pipeline (PIPELINE_TRIGGER)", async () => {
      // Trigger is expected to return 201 (or 404 if no runner is configured)
      const res = await request(app.getHttpServer())
        .post(`/api/v1/pipelines/${pipelineId}/trigger`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({});
      // Accept both 201 (success) and 404 (pipeline runner unavailable in test)
      expect([201, 404]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // Organization management — ORG_MANAGE
  // ---------------------------------------------------------------------------

  describe("Organization management permission gates", () => {
    it("viewer cannot update the organization (ORG_MANAGE)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ name: "hacked-name" })
        .expect(403);
    });

    it("owner can update the organization (ORG_MANAGE)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Updated Org Name" })
        .expect(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Teams — TEAM_MANAGE
  // ---------------------------------------------------------------------------

  describe("Teams permission gates", () => {
    it("viewer cannot create a team (TEAM_MANAGE)", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/teams")
        .set("Authorization", `Bearer ${viewerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({
          name: "viewer-team",
          displayName: "Viewer Team",
          type: "platform",
        })
        .expect(403);
    });

    it("owner can create a team (TEAM_MANAGE)", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/teams")
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Organization-Id", organizationId)
        .send({
          name: "owner-rbac-team",
          displayName: "Owner RBAC Team",
          type: "platform",
        })
        .expect(201);
    });
  });
});
