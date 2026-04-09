import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CostEstimate } from "../src/modules/finops/entities/cost-estimate.entity";
import { ActualCost } from "../src/modules/finops/entities/actual-cost.entity";
import { Team } from "../src/modules/teams/entities/team.entity";

/**
 * Response shape for cost-estimate endpoint.
 */
interface CostEstimateResponse {
  id: string;
  componentId: string;
  currency: string;
  estimatedMonthlyCost: number;
  diffMonthlyCost: number;
  pipelineRunId: string | null;
  measuredAt: string;
}

/**
 * Response shape for actual-cost endpoint.
 */
interface ActualCostResponse {
  componentId: string;
  sevenDay: Record<string, unknown> | null;
  thirtyDay: Record<string, unknown> | null;
}

/**
 * Response shape for history endpoint.
 */
interface ActualCostRecord {
  id: string;
  componentId: string;
  totalCost: number;
  syncedAt: string;
}

/**
 * Response shape for team summary endpoint.
 */
interface TeamSummaryResponse {
  teamId: string;
  totalCost: number;
  currency: string;
  components: { componentId: string; totalCost: number; window: string }[];
}

/**
 * Response shape for platform summary endpoint.
 */
interface PlatformCostItem {
  componentId: string;
  totalCost: number;
  currency: string;
  syncedAt: string;
}

/**
 * Helper that creates a component via the HTTP API and returns its ID.
 */
async function createComponent(
  app: INestApplication<App>,
  token: string,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post("/api/v1/catalog/components")
    .set("Authorization", `Bearer ${token}`)
    .send({ name, kind: "service", owner: "platform-team", ...extra })
    .expect(201);
  return (res.body as { id: string }).id;
}

/**
 * End-to-end tests for the FinOps API.
 * Uses a better-sqlite3 in-memory database; OpenCost is not contacted.
 */
describe("FinOps (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let costEstimateRepo: Repository<CostEstimate>;
  let actualCostRepo: Repository<ActualCost>;
  let teamRepo: Repository<Team>;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token } = await registerAndLogin(app));

    costEstimateRepo = app.get<Repository<CostEstimate>>(
      getRepositoryToken(CostEstimate),
    );
    actualCostRepo = app.get<Repository<ActualCost>>(
      getRepositoryToken(ActualCost),
    );
    teamRepo = app.get<Repository<Team>>(getRepositoryToken(Team));
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  describe("GET /api/v1/catalog/components/:id/cost-estimate", () => {
    it("returns 401 when no token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/catalog/components/some-id/cost-estimate")
        .expect(401);
    });

    it("returns 404 when no estimate exists for the component", async () => {
      const componentId = await createComponent(
        app,
        token,
        "no-estimate-service",
      );
      await request(app.getHttpServer())
        .get(`/api/v1/catalog/components/${componentId}/cost-estimate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("returns 200 with the estimate after upserting", async () => {
      const componentId = await createComponent(
        app,
        token,
        "estimated-service",
      );

      // Seed an estimate directly via the repository.
      const estimate = costEstimateRepo.create({
        estimatedMonthlyCost: 15.75,
        diffMonthlyCost: 3.0,
        currency: "USD",
        measuredAt: new Date(),
      });

      (estimate as unknown as Record<string, unknown>).componentId =
        componentId;
      await costEstimateRepo.save(estimate);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/catalog/components/${componentId}/cost-estimate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = res.body as CostEstimateResponse;
      expect(body.componentId).toBe(componentId);
      expect(body.currency).toBe("USD");
      expect(Number(body.estimatedMonthlyCost)).toBeCloseTo(15.75, 1);
    });
  });

  // -------------------------------------------------------------------------
  describe("GET /api/v1/cost/components/:id/actual", () => {
    it("returns 401 when no token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/cost/components/some-id/actual")
        .expect(401);
    });

    it("returns 404 when the component does not exist", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/cost/components/non-existent-uuid/actual")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("returns sevenDay/thirtyDay null when OpenCost is unreachable", async () => {
      const componentId = await createComponent(
        app,
        token,
        "opencost-test-service",
      );

      const res = await request(app.getHttpServer())
        .get(`/api/v1/cost/components/${componentId}/actual`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = res.body as ActualCostResponse;
      expect(body.componentId).toBe(componentId);
      // OpenCost is not running in test env → both should be null.
      expect(body.sevenDay).toBeNull();
      expect(body.thirtyDay).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("GET /api/v1/cost/components/:id/history", () => {
    it("returns 401 when no token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/cost/components/some-id/history")
        .expect(401);
    });

    it("returns an empty array when no history exists", async () => {
      const componentId = await createComponent(
        app,
        token,
        "history-test-service",
      );

      const res = await request(app.getHttpServer())
        .get(`/api/v1/cost/components/${componentId}/history`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body as unknown[]).toHaveLength(0);
    });

    it("returns up to 30 records ordered by syncedAt DESC", async () => {
      const componentId = await createComponent(
        app,
        token,
        "history-records-service",
      );

      // Seed two cost records.
      await actualCostRepo.save(
        actualCostRepo.create({
          componentId: componentId as unknown as string,
          window: "30d",
          totalCost: 5.0,
          currency: "USD",
          syncedAt: new Date("2024-01-01"),
        }),
      );
      await actualCostRepo.save(
        actualCostRepo.create({
          componentId: componentId as unknown as string,
          window: "30d",
          totalCost: 8.0,
          currency: "USD",
          syncedAt: new Date("2024-01-02"),
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/api/v1/cost/components/${componentId}/history`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = res.body as ActualCostRecord[];
      expect(body).toHaveLength(2);
      // Most recent first.
      expect(Number(body[0].totalCost)).toBeCloseTo(8.0, 1);
    });
  });

  // -------------------------------------------------------------------------
  describe("GET /api/v1/cost/teams/:id/summary", () => {
    it("returns 401 when no token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/cost/teams/some-id/summary")
        .expect(401);
    });

    it("returns 404 when the team does not exist", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/cost/teams/non-existent-team/summary")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("returns teamId/totalCost/currency/components for a valid team", async () => {
      // Create team via repository (no HTTP endpoint for team creation that
      // ties back to component teamId in one step).
      const team = teamRepo.create({
        name: "finops-test-team",
        displayName: "FinOps Test Team",
      });
      const savedTeam = await teamRepo.save(team);

      const componentId = await createComponent(app, token, "team-service", {
        teamId: savedTeam.id,
      });

      await actualCostRepo.save(
        actualCostRepo.create({
          componentId: componentId as unknown as string,
          window: "30d",
          totalCost: 20.0,
          currency: "USD",
          syncedAt: new Date(),
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/api/v1/cost/teams/${savedTeam.id}/summary`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = res.body as TeamSummaryResponse;
      expect(body.teamId).toBe(savedTeam.id);
      expect(Number(body.totalCost)).toBeCloseTo(20.0, 1);
      expect(body.currency).toBe("USD");
      expect(Array.isArray(body.components)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("GET /api/v1/cost/summary", () => {
    it("returns 401 when no token is provided", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/cost/summary")
        .expect(401);
    });

    it("returns an array (possibly empty) of cost summaries", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/cost/summary?limit=5")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns records sorted by totalCost DESC", async () => {
      const cheapId = await createComponent(app, token, "cheap-comp-summary");
      const expensiveId = await createComponent(
        app,
        token,
        "expensive-comp-summary",
      );

      const now = new Date();
      await actualCostRepo.save(
        actualCostRepo.create({
          componentId: cheapId as unknown as string,
          window: "30d",
          totalCost: 5.0,
          currency: "USD",
          syncedAt: now,
        }),
      );
      await actualCostRepo.save(
        actualCostRepo.create({
          componentId: expensiveId as unknown as string,
          window: "30d",
          totalCost: 100.0,
          currency: "USD",
          syncedAt: now,
        }),
      );

      const res = await request(app.getHttpServer())
        .get("/api/v1/cost/summary?limit=10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = res.body as PlatformCostItem[];
      const totals = body.map((r) => r.totalCost);
      // Verify descending order.
      for (let i = 1; i < totals.length; i++) {
        expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i]);
      }
    });
  });
});
