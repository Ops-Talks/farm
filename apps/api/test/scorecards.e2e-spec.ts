import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * Minimal shape of the ScorecardResult JSON returned by the API.
 */
interface ScorecardResultResponse {
  id: string;
  componentId: string;
  overallScore: number;
  level: string;
  categoryScores: Record<string, number> | null;
  criteria: Array<{ id: string; passed: boolean }> | null;
  evaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Minimal shape of the overview JSON returned by GET /scorecards/overview.
 */
interface ScorecardOverviewResponse {
  totalComponents: number;
  averageScore: number;
  levelDistribution: Record<string, number>;
  byTeam: Array<{
    teamId: string;
    teamName: string;
    averageScore: number;
    componentCount: number;
  }>;
}

describe("Scorecards API (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let componentId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token } = await registerAndLogin(app));

    // Create a catalog component so the scorecard evaluator has something to work with.
    const res = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "e2e-scorecard-svc",
        kind: "service",
        owner: "team-a",
        description: "E2E scorecard test service",
        lifecycle: "production",
      })
      .expect(201);

    componentId = (res.body as { id: string }).id;
    expect(componentId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // 1. GET /scorecards/components/:id — 404 before any computation
  // ---------------------------------------------------------------------------

  it("GET /api/v1/scorecards/components/:id should return 404 when no scorecard has been computed for the component", async () => {
    // Use the real component created in beforeAll. No scorecard has been
    // computed yet at this point, so the controller must return 404 for the
    // correct reason (scorecard result row does not exist) rather than because
    // the component UUID itself is unknown.
    await request(app.getHttpServer())
      .get(`/api/v1/scorecards/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  // ---------------------------------------------------------------------------
  // 2. POST /scorecards/components/:componentId/refresh — triggers evaluation
  // ---------------------------------------------------------------------------

  it("POST /api/v1/scorecards/components/:componentId/refresh should evaluate the component and return a scorecard result", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/scorecards/components/${componentId}/refresh`)
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(201);

    const body = res.body as ScorecardResultResponse;

    expect(body.componentId).toBe(componentId);
    expect(typeof body.overallScore).toBe("number");
    expect(body.overallScore).toBeGreaterThanOrEqual(0);
    expect(body.overallScore).toBeLessThanOrEqual(100);
    expect(["none", "bronze", "silver", "gold", "platinum"]).toContain(
      body.level,
    );
    expect(body.categoryScores).toBeDefined();
    expect(Array.isArray(body.criteria)).toBe(true);
    expect((body.criteria as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(body.id).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 3. GET /scorecards/components/:componentId — returns stored scorecard
  // ---------------------------------------------------------------------------

  it("GET /api/v1/scorecards/components/:componentId should return the stored scorecard after refresh", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/scorecards/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = res.body as ScorecardResultResponse;

    expect(body.componentId).toBe(componentId);
    expect(typeof body.overallScore).toBe("number");
    expect(["none", "bronze", "silver", "gold", "platinum"]).toContain(
      body.level,
    );
    expect(body.id).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 4. GET /scorecards — lists all scorecard results
  // ---------------------------------------------------------------------------

  it("GET /api/v1/scorecards should return an array containing the refreshed component scorecard", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/scorecards")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = res.body as ScorecardResultResponse[];

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);

    const entry = body.find((r) => r.componentId === componentId);
    expect(entry).toBeDefined();
    expect(typeof entry!.overallScore).toBe("number");
    expect(["none", "bronze", "silver", "gold", "platinum"]).toContain(
      entry!.level,
    );
  });

  // ---------------------------------------------------------------------------
  // 5. GET /scorecards/overview — returns aggregated overview
  // ---------------------------------------------------------------------------

  it("GET /api/v1/scorecards/overview should return overview stats with at least one component", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/scorecards/overview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = res.body as ScorecardOverviewResponse;

    expect(typeof body.totalComponents).toBe("number");
    expect(body.totalComponents).toBeGreaterThanOrEqual(1);

    expect(typeof body.averageScore).toBe("number");
    expect(body.averageScore).toBeGreaterThanOrEqual(0);
    expect(body.averageScore).toBeLessThanOrEqual(100);

    expect(body.levelDistribution).toBeDefined();
    expect(typeof body.levelDistribution).toBe("object");

    // All ScorecardLevel keys must be present in the distribution
    for (const level of ["none", "bronze", "silver", "gold", "platinum"]) {
      expect(body.levelDistribution).toHaveProperty(level);
    }

    expect(Array.isArray(body.byTeam)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. All scorecard endpoints require authentication
  // ---------------------------------------------------------------------------

  it("all scorecard endpoints should return 401 when no Bearer token is supplied", async () => {
    await request(app.getHttpServer()).get("/api/v1/scorecards").expect(401);

    await request(app.getHttpServer())
      .get("/api/v1/scorecards/overview")
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/scorecards/components/${componentId}`)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/scorecards/components/${componentId}/refresh`)
      .send({})
      .expect(401);
  });
});
