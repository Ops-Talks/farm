import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface SloResponse {
  id: string;
  name: string;
  description?: string;
  targetPercent: number;
  metricType: string;
  window: string;
  componentId?: string;
  organizationId?: string;
  enabled: boolean;
}

interface BudgetResponse {
  sloId: string;
  name: string;
  targetPercent: number;
  currentPercent: number;
  budgetRemaining: number;
  burnRate: number;
  status: string;
  windowStart: string;
  windowEnd: string;
}

describe("SLOs CRUD (e2e)", () => {
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

  it("should complete the full SLO lifecycle: create -> list -> get -> budget -> update -> delete", async () => {
    // Step 1: Create an SLO
    const createDto = {
      name: "e2e-api-availability",
      description: "E2E availability SLO",
      targetPercent: 99.95,
      metricType: "availability",
      window: "30d",
      organizationId,
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/slos")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(createDto)
      .expect(201);

    const created = createRes.body as SloResponse;
    expect(created.id).toBeDefined();
    expect(created.name).toBe(createDto.name);
    expect(Number(created.targetPercent)).toBe(createDto.targetPercent);
    expect(created.metricType).toBe(createDto.metricType);
    expect(created.window).toBe(createDto.window);

    const sloId = created.id;

    // Step 2: List all SLOs
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/slos")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const listBody = listRes.body as {
      data: SloResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((s) => s.id === sloId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 3: Get by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/slos/${sloId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const fetched = getRes.body as SloResponse;
    expect(fetched.id).toBe(sloId);
    expect(fetched.name).toBe(createDto.name);

    // Step 4: Get budget
    const budgetRes = await request(app.getHttpServer())
      .get(`/api/v1/slos/${sloId}/budget`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const budget = budgetRes.body as BudgetResponse;
    expect(budget.sloId).toBe(sloId);
    expect(budget.name).toBe(createDto.name);
    expect(typeof budget.currentPercent).toBe("number");
    expect(typeof budget.budgetRemaining).toBe("number");
    expect(typeof budget.burnRate).toBe("number");
    expect(budget.status).toBeDefined();
    expect(budget.windowStart).toBeDefined();
    expect(budget.windowEnd).toBeDefined();

    // Step 5: Update the SLO
    const updateDto = {
      description: "Updated E2E availability SLO",
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/slos/${sloId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(updateDto)
      .expect(200);

    const updated = updateRes.body as SloResponse;
    expect(updated.description).toBe(updateDto.description);

    // Step 6: Delete the SLO
    await request(app.getHttpServer())
      .delete(`/api/v1/slos/${sloId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Step 7: Confirm deletion returns 404
    await request(app.getHttpServer())
      .get(`/api/v1/slos/${sloId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });

  it("should reject duplicate SLO names (409)", async () => {
    const sloDto = {
      name: "e2e-unique-slo",
      targetPercent: 99.9,
      metricType: "availability",
      window: "7d",
      organizationId,
    };

    await request(app.getHttpServer())
      .post("/api/v1/slos")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(sloDto)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/slos")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(sloDto)
      .expect(409);
  });

  it("should reject creation with invalid metricType (400)", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/slos")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "bad-metric-slo",
        targetPercent: 99.0,
        metricType: "nonexistent_metric",
        window: "30d",
      })
      .expect(400);
  });

  it("should return 404 for non-existent SLO budget", async () => {
    const fakeUuid = "00000000-0000-4000-8000-000000000000";

    await request(app.getHttpServer())
      .get(`/api/v1/slos/${fakeUuid}/budget`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });
});
