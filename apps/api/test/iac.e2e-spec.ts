import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

const INGEST_TOKEN = "e2e-iac-ingest-token";

describe("IaC Module (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    process.env.IAC_INGEST_TOKEN = INGEST_TOKEN;
    app = await createE2EApp();
    ({ token } = await registerAndLogin(app));
  });

  afterAll(async () => {
    delete process.env.IAC_INGEST_TOKEN;
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/iac/runs/ingest
  // ---------------------------------------------------------------------------
  describe("POST /api/v1/iac/runs/ingest", () => {
    it("should return 201 and persist the run with a valid token", async () => {
      const dto = {
        stackName: "core-networking",
        environment: "production",
        provider: "terraform",
        type: "plan",
        status: "succeeded",
        resourceChanges: { add: 2, change: 1, destroy: 0 },
        triggeredBy: "github-actions",
        startedAt: "2024-01-01T10:00:00Z",
        finishedAt: "2024-01-01T10:03:00Z",
        durationMs: 180000,
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(dto)
        .expect(201);

      const body = res.body as {
        id: string;
        type: string;
        status: string;
        environment: string;
      };
      expect(body.id).toBeDefined();
      expect(body.type).toBe("plan");
      expect(body.status).toBe("succeeded");
      expect(body.environment).toBe("production");
    });

    it("should return 401 with an invalid token", async () => {
      const dto = {
        stackName: "core-networking",
        environment: "production",
        type: "plan",
        status: "succeeded",
      };

      await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .set("Authorization", "Bearer wrong-token")
        .send(dto)
        .expect(401);
    });

    it("should return 401 when Authorization header is absent", async () => {
      const dto = {
        stackName: "core-networking",
        environment: "production",
        type: "plan",
        status: "succeeded",
      };

      await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .send(dto)
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/iac/stacks/import
  // ---------------------------------------------------------------------------
  describe("POST /api/v1/iac/stacks/import", () => {
    it("should return 201 with created and updated counts for a valid token", async () => {
      const dto = {
        stacks: [
          {
            name: "core-database",
            environment: "staging",
            provider: "terraform",
            repositoryUrl: "https://github.com/acme/infra",
          },
          {
            name: "core-cache",
            environment: "staging",
            provider: "opentofu",
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/iac/stacks/import")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(dto)
        .expect(201);

      const importBody = res.body as { created: number; updated: number };
      expect(typeof importBody.created).toBe("number");
      expect(typeof importBody.updated).toBe("number");
      expect(importBody.created + importBody.updated).toBe(2);
    });

    it("should return 401 with an invalid token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/iac/stacks/import")
        .set("Authorization", "Bearer bad")
        .send({ stacks: [] })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/iac/module-drift/ingest
  // ---------------------------------------------------------------------------
  describe("POST /api/v1/iac/module-drift/ingest", () => {
    it("should return 201 for a valid token and valid payload", async () => {
      const dto = {
        modules: [
          {
            stackPath: "stacks/networking/main.tf",
            moduleName: "terraform-aws-modules/vpc/aws",
            sourceUrl: "registry.terraform.io/terraform-aws-modules/vpc/aws",
            currentRef: "v3.14.0",
            latestRef: "v3.19.0",
          },
        ],
      };

      await request(app.getHttpServer())
        .post("/api/v1/iac/module-drift/ingest")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(dto)
        .expect(201);
    });

    it("should return 401 with an invalid token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/iac/module-drift/ingest")
        .set("Authorization", "Bearer bad")
        .send({ modules: [] })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/iac/dashboard
  // ---------------------------------------------------------------------------
  describe("GET /api/v1/iac/dashboard", () => {
    it("should return 200 with a valid dashboard shape when authenticated with JWT", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const dashBody = res.body as {
        totalStacks: number;
        failedLastRun: number;
        environments: string[];
        stacksByEnvironment: Record<string, unknown>;
      };
      expect(typeof dashBody.totalStacks).toBe("number");
      expect(typeof dashBody.failedLastRun).toBe("number");
      expect(Array.isArray(dashBody.environments)).toBe(true);
      expect(typeof dashBody.stacksByEnvironment).toBe("object");
    });

    it("should return 401 without a JWT token", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/iac/dashboard")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/iac/stacks/:id/runs
  // ---------------------------------------------------------------------------
  describe("GET /api/v1/iac/stacks/:id/runs", () => {
    let stackRunId: string;

    beforeAll(async () => {
      // Ingest a run to ensure we have a stackId to query
      const ingestRes = await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send({
          stackName: "paginated-stack",
          environment: "test",
          type: "apply",
          status: "succeeded",
          startedAt: "2024-02-01T09:00:00Z",
        })
        .expect(201);

      stackRunId = (ingestRes.body as { stackId: string }).stackId;
    });

    it("should return 200 with paginated run data", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackRunId}/runs?page=1&limit=10`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const runsBody = res.body as { total: number; data: unknown[] };
      expect(typeof runsBody.total).toBe("number");
      expect(Array.isArray(runsBody.data)).toBe(true);
    });

    it("should return 401 without JWT", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackRunId}/runs`)
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/iac/module-drift
  // ---------------------------------------------------------------------------
  describe("GET /api/v1/iac/module-drift", () => {
    it("should return 200 with an array of drift records", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac/module-drift")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 401 without JWT", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/iac/module-drift")
        .expect(401);
    });
  });
});
