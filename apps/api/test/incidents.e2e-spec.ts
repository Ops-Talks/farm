import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface IncidentResponse {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  organizationId: string;
  resolvedAt: string | null;
  affectedComponents: unknown[];
  affectedEnvironments: unknown[];
}

interface IncidentUpdateResponse {
  id: string;
  incidentId: string;
  message: string;
  previousStatus: string | null;
  newStatus: string | null;
}

interface PostMortemResponse {
  id: string;
  incidentId: string;
  rootCause: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

interface PaginatedIncidents {
  data: IncidentResponse[];
  total: number;
  skip: number;
  take: number;
}

describe("Incidents Lifecycle (e2e)", () => {
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

  it("should complete the full incident lifecycle: create -> list -> get -> update status -> delete", async () => {
    // Step 1: Create an incident
    const createDto = {
      title: "Database connection pool exhaustion",
      description:
        "All PostgreSQL connections are saturated causing 503 errors",
      severity: "P1",
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(createDto)
      .expect(201);

    const created = createRes.body as IncidentResponse;
    expect(created.id).toBeDefined();
    expect(created.title).toBe(createDto.title);
    expect(created.severity).toBe("P1");
    expect(created.status).toBe("open");

    const incidentId = created.id;

    // Step 2: List incidents
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/incidents")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const listBody = listRes.body as PaginatedIncidents;
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((i) => i.id === incidentId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 3: Get incident by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const fetched = getRes.body as IncidentResponse;
    expect(fetched.id).toBe(incidentId);
    expect(fetched.title).toBe(createDto.title);

    // Step 4: Transition open -> investigating
    const investigatingRes = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "investigating", message: "Starting investigation" })
      .expect(200);

    expect((investigatingRes.body as IncidentResponse).status).toBe(
      "investigating",
    );

    // Step 5: Transition investigating -> identified
    const identifiedRes = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "identified", message: "Root cause found" })
      .expect(200);

    expect((identifiedRes.body as IncidentResponse).status).toBe("identified");

    // Step 6: Transition identified -> resolved
    const resolvedRes = await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "resolved", message: "Issue fixed" })
      .expect(200);

    const resolved = resolvedRes.body as IncidentResponse;
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAt).toBeDefined();

    // Step 7: Delete incident
    await request(app.getHttpServer())
      .delete(`/api/v1/incidents/${incidentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Verify deletion
    await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });

  it("should reject invalid status transitions (resolved -> open)", async () => {
    // Create an incident and bring it to resolved state
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        title: "Transition test incident",
        severity: "P2",
      })
      .expect(201);

    const incidentId = (createRes.body as IncidentResponse).id;

    // open -> investigating
    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "investigating" })
      .expect(200);

    // investigating -> identified
    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "identified" })
      .expect(200);

    // identified -> resolved
    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "resolved" })
      .expect(200);

    // resolved -> open (should fail)
    await request(app.getHttpServer())
      .patch(`/api/v1/incidents/${incidentId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ status: "open" })
      .expect(400);
  });

  it("should create and retrieve timeline entries", async () => {
    // Create an incident
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        title: "Timeline test incident",
        severity: "P3",
      })
      .expect(201);

    const incidentId = (createRes.body as IncidentResponse).id;

    // Create a manual timeline entry
    const updateRes = await request(app.getHttpServer())
      .post(`/api/v1/incidents/${incidentId}/updates`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ message: "Scaling database replicas from 2 to 5" })
      .expect(201);

    const entry = updateRes.body as IncidentUpdateResponse;
    expect(entry.id).toBeDefined();
    expect(entry.incidentId).toBe(incidentId);
    expect(entry.message).toBe("Scaling database replicas from 2 to 5");

    // Retrieve timeline
    const timelineRes = await request(app.getHttpServer())
      .get(`/api/v1/incidents/${incidentId}/timeline`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const timeline = timelineRes.body as IncidentUpdateResponse[];
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThanOrEqual(1);
    expect(
      timeline.some(
        (e) => e.message === "Scaling database replicas from 2 to 5",
      ),
    ).toBe(true);
  });

  it("should create and retrieve post-mortem for an incident", async () => {
    // Create an incident
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        title: "Post-mortem test incident",
        severity: "P1",
      })
      .expect(201);

    const incidentId = (createRes.body as IncidentResponse).id;

    // Create post-mortem
    const pmRes = await request(app.getHttpServer())
      .post("/api/v1/post-mortems")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        incidentId,
        rootCause: "Connection pool max size was set to 5 instead of 50",
        contributingFactors: ["Missing monitoring", "No autoscaling"],
        body: "## Summary\nFull post-mortem write-up",
      })
      .expect(201);

    const postMortem = pmRes.body as PostMortemResponse;
    expect(postMortem.id).toBeDefined();
    expect(postMortem.incidentId).toBe(incidentId);
    expect(postMortem.rootCause).toBe(
      "Connection pool max size was set to 5 instead of 50",
    );

    // Retrieve post-mortem by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/post-mortems/${postMortem.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((getRes.body as PostMortemResponse).id).toBe(postMortem.id);

    // Retrieve post-mortem by incident ID
    const byIncidentRes = await request(app.getHttpServer())
      .get(`/api/v1/post-mortems/by-incident/${incidentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((byIncidentRes.body as PostMortemResponse).incidentId).toBe(
      incidentId,
    );
  });

  it("should approve a post-mortem", async () => {
    // Create an incident
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/incidents")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        title: "Approval test incident",
        severity: "P2",
      })
      .expect(201);

    const incidentId = (createRes.body as IncidentResponse).id;

    // Create post-mortem
    const pmRes = await request(app.getHttpServer())
      .post("/api/v1/post-mortems")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        incidentId,
        rootCause: "Misconfigured autoscaler",
      })
      .expect(201);

    const postMortemId = (pmRes.body as PostMortemResponse).id;

    // Approve post-mortem
    const approveRes = await request(app.getHttpServer())
      .patch(`/api/v1/post-mortems/${postMortemId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const approved = approveRes.body as PostMortemResponse;
    expect(approved.approvedBy).toBeDefined();
    expect(approved.approvedAt).toBeDefined();
  });
});
