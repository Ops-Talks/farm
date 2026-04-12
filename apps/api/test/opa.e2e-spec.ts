import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { OpaService } from "../src/modules/opa/opa.service";

/**
 * E2E tests for the OPA integration module.
 *
 * Uses an in-memory SQLite database via createE2EApp() and overrides
 * OpaService with lightweight mocks so the tests run without a real OPA server.
 */
describe("OPA (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let adminOrganizationId: string;

  let originalFetch: typeof globalThis.fetch;

  // ---------------------------------------------------------------------------
  // Mock OpaService
  // ---------------------------------------------------------------------------

  const mockOpaService: Partial<OpaService> = {
    isReachable: jest.fn().mockResolvedValue(false),
    getOpaUrl: jest.fn().mockReturnValue("http://localhost:8181"),
    evaluate: jest.fn().mockResolvedValue({ allowed: true, violations: [] }),
    saveResult: jest.fn().mockResolvedValue({
      id: "result-uuid-1",
      componentId: "comp-uuid-1",
      policyPath: "app/allow",
      allowed: true,
      violations: [],
      evaluatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    listResults: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    originalFetch = globalThis.fetch;

    app = await createE2EApp();

    const opaService = app.get(OpaService);
    Object.assign(opaService, mockOpaService);

    ({ token: adminToken, organizationId: adminOrganizationId } =
      await registerAndLogin(app));
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/opa/status
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/opa/status", () => {
    it("returns 200 with reachable field", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/opa/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(res.body).toHaveProperty("reachable");
      expect(res.body).toHaveProperty("url");
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer()).get("/api/v1/opa/status").expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/opa/evaluate
  // ---------------------------------------------------------------------------

  describe("POST /api/v1/opa/evaluate", () => {
    it("returns 201 with evaluation result", async () => {
      (mockOpaService.evaluate as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        violations: [],
      });

      const res = await request(app.getHttpServer())
        .post("/api/v1/opa/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .send({ policyPath: "app/allow", input: { user: "alice" } })
        .expect(201);

      expect(res.body).toHaveProperty("allowed");
      expect(res.body).toHaveProperty("violations");
      expect(res.body).toHaveProperty("policyPath", "app/allow");
    });

    it("returns 201 and persists result when componentId provided", async () => {
      (mockOpaService.evaluate as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        violations: ["missing label env"],
      });

      const res = await request(app.getHttpServer())
        .post("/api/v1/opa/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .send({
          policyPath: "app/rbac",
          input: { resource: "deployment" },
          componentId: "550e8400-e29b-41d4-a716-446655440000",
        })
        .expect(201);

      const body = res.body as { allowed: boolean; violations: string[] };
      expect(body.allowed).toBe(false);
      expect(body.violations).toEqual(["missing label env"]);
      expect(mockOpaService.saveResult).toHaveBeenCalled();
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/opa/evaluate")
        .send({ policyPath: "app/allow", input: {} })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/opa/results/:componentId
  // ---------------------------------------------------------------------------

  describe("GET /api/v1/opa/results/:componentId", () => {
    it("returns 200 with array of results", async () => {
      (mockOpaService.listResults as jest.Mock).mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/opa/results/comp-uuid-1")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns 401 without authentication", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/opa/results/comp-uuid-1")
        .expect(401);
    });
  });
});
