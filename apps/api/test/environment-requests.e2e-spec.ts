import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface EnvRequestResponse {
  id: string;
  name: string;
  description?: string;
  requestedBy: string;
  type: string;
  tier: string;
  ttlHours: number;
  status: string;
  statusMessage?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  provisionedAt?: string;
  expiresAt?: string;
  componentId?: string;
  environmentId?: string;
  organizationId?: string;
}

describe("Environment Requests CRUD (e2e)", () => {
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

  it("should complete the full environment request lifecycle: create -> list -> get -> approve -> expire", async () => {
    // Step 1: Create an environment request
    const createDto = {
      name: "staging-feature-test",
      description: "E2E test environment",
      type: "ephemeral",
      tier: "small",
      ttlHours: 48,
      organizationId,
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/environment-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(createDto)
      .expect(201);

    const created = createRes.body as EnvRequestResponse;
    expect(created.name).toBe("staging-feature-test");
    expect(created.type).toBe("ephemeral");
    expect(created.tier).toBe("small");
    expect(created.ttlHours).toBe(48);
    expect(created.status).toBe("pending");

    // Step 2: List requests
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/environment-requests?status=pending")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const listBody = listRes.body as {
      data: EnvRequestResponse[];
      total: number;
    };
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.data.some((r) => r.name === "staging-feature-test")).toBe(
      true,
    );

    // Step 3: Get by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/environment-requests/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((getRes.body as EnvRequestResponse).name).toBe(
      "staging-feature-test",
    );

    // Step 4: Approve
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/environment-requests/${created.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ comment: "Looks good" })
      .expect(200);

    const approved = approveRes.body as EnvRequestResponse;
    expect(approved.status).toBe("active");
    expect(approved.provisionedAt).toBeDefined();
    expect(approved.expiresAt).toBeDefined();

    // Step 5: Expire
    const expireRes = await request(app.getHttpServer())
      .post(`/api/v1/environment-requests/${created.id}/expire`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((expireRes.body as EnvRequestResponse).status).toBe("expired");
  });

  it("should reject an environment request", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/environment-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "staging-rejected",
        type: "persistent",
        tier: "large",
        ttlHours: 720,
      })
      .expect(201);

    const created = createRes.body as EnvRequestResponse;

    const rejectRes = await request(app.getHttpServer())
      .post(`/api/v1/environment-requests/${created.id}/reject`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ comment: "Too expensive" })
      .expect(200);

    const rejected = rejectRes.body as EnvRequestResponse;
    expect(rejected.status).toBe("rejected");
    expect(rejected.statusMessage).toBe("Too expensive");
  });

  it("should prevent updating a non-pending request", async () => {
    // Create and approve a request
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/environment-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "staging-no-update",
        type: "ephemeral",
        tier: "medium",
      })
      .expect(201);

    const created = createRes.body as EnvRequestResponse;

    await request(app.getHttpServer())
      .post(`/api/v1/environment-requests/${created.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({})
      .expect(200);

    // Try to update the approved request
    await request(app.getHttpServer())
      .patch(`/api/v1/environment-requests/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ name: "new-name" })
      .expect(400);
  });

  it("should prevent approving a non-pending request", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/environment-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "staging-double-approve",
        type: "ephemeral",
        tier: "small",
      })
      .expect(201);

    const created = createRes.body as EnvRequestResponse;

    // Reject it first
    await request(app.getHttpServer())
      .post(`/api/v1/environment-requests/${created.id}/reject`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({})
      .expect(200);

    // Try to approve the rejected request
    await request(app.getHttpServer())
      .post(`/api/v1/environment-requests/${created.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({})
      .expect(400);
  });

  it("should delete a pending environment request", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/environment-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "staging-to-delete",
        type: "ephemeral",
        tier: "small",
      })
      .expect(201);

    const created = createRes.body as EnvRequestResponse;

    await request(app.getHttpServer())
      .delete(`/api/v1/environment-requests/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Verify deletion
    await request(app.getHttpServer())
      .get(`/api/v1/environment-requests/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });
});
