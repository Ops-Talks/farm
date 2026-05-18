import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

const INGEST_TOKEN = "e2e-iac-ingest-token";

describe("IaC Module (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    process.env.IAC_INGEST_TOKEN = INGEST_TOKEN;
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));
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
        .set("X-Organization-Id", organizationId)
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
        .set("X-Organization-Id", organizationId)
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
        .set("X-Organization-Id", organizationId)
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
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 401 without JWT", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/iac/module-drift")
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/iac/stacks (FARM-S277 / FARM-T244)
  // ---------------------------------------------------------------------------
  describe("GET /api/v1/iac/stacks", () => {
    beforeAll(async () => {
      // Ingest a run so we always have at least one stack in staging
      await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .set("X-Organization-Id", organizationId)
        .send({
          stackName: "stack-list-e2e",
          environment: "staging",
          provider: "terraform",
          type: "plan",
          status: "succeeded",
        })
        .expect(201);
    });

    it("should return 200 with an array of stacks", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac/stacks")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it("should return 401 without JWT", async () => {
      await request(app.getHttpServer()).get("/api/v1/iac/stacks").expect(401);
    });

    it("should filter by environment and return only matching stacks (FARM-ST401)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac/stacks?environment=staging")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const stacks = res.body as { environment: string }[];
      expect(Array.isArray(stacks)).toBe(true);
      stacks.forEach((s) => {
        expect(s.environment).toBe("staging");
      });
    });

    it("should return an empty array when no stacks match the environment filter (FARM-ST401)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac/stacks?environment=nonexistent-env-xyz")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("should return an empty array when componentId filter matches nothing (FARM-ST400)", async () => {
      const res = await request(app.getHttpServer())
        .get(
          "/api/v1/iac/stacks?componentId=00000000-0000-0000-0000-000000000000",
        )
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("should include lastRun field on each stack", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac/stacks?environment=staging")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const stacks = res.body as Record<string, unknown>[];
      expect(stacks.length).toBeGreaterThanOrEqual(1);
      expect("lastRun" in stacks[0]).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/iac/stacks/:id (FARM-S277 / FARM-T245)
  // ---------------------------------------------------------------------------
  describe("GET /api/v1/iac/stacks/:id", () => {
    let stackDetailId: string;

    beforeAll(async () => {
      const ingestRes = await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .set("X-Organization-Id", organizationId)
        .send({
          stackName: "stack-detail-e2e",
          environment: "production",
          provider: "terraform",
          type: "apply",
          status: "succeeded",
        })
        .expect(201);

      stackDetailId = (ingestRes.body as { stackId: string }).stackId;
    });

    it("should return 200 with the correct stack shape", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackDetailId}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.id).toBe(stackDetailId);
      expect(typeof body.name).toBe("string");
      expect(typeof body.environment).toBe("string");
      expect("lastRun" in body).toBe(true);
    });

    it("should return 401 without JWT", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackDetailId}`)
        .expect(401);
    });

    it("should return 404 for a non-existent stack ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/iac/stacks/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(404);
    });
  });
});

// ---------------------------------------------------------------------------
// IaC Module Catalog E2E (FARM-E68)
// ---------------------------------------------------------------------------

describe("IaC Module Catalog (e2e)", () => {
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

  describe("POST /api/v1/iac-modules", () => {
    it("creates a module and returns 201", async () => {
      const dto = {
        name: "terraform-aws-vpc",
        provider: "aws",
        sourceRepoUrl:
          "https://github.com/terraform-aws-modules/terraform-aws-vpc",
        description: "Creates a VPC on AWS",
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .send(dto)
        .expect(201);

      const body = res.body as {
        id: string;
        name: string;
        provider: string;
        latestVersion: string | null;
      };
      expect(body.id).toBeDefined();
      expect(body.name).toBe("terraform-aws-vpc");
      expect(body.provider).toBe("aws");
      expect(body.latestVersion).toBeNull();
    });

    it("returns 409 when a module with the same name+provider exists", async () => {
      const dto = {
        name: "terraform-aws-vpc",
        provider: "aws",
        sourceRepoUrl:
          "https://github.com/terraform-aws-modules/terraform-aws-vpc",
      };

      await request(app.getHttpServer())
        .post("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .send(dto)
        .expect(409);
    });

    it("returns 401 without JWT", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/iac-modules")
        .send({
          name: "x",
          provider: "aws",
          sourceRepoUrl: "https://github.com/x/y",
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/iac-modules", () => {
    it("returns a list of modules", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    });

    it("filters by provider", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules?provider=aws")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body = res.body as { provider: string }[];
      expect(body.every((m) => m.provider === "aws")).toBe(true);
    });
  });

  describe("GET /api/v1/iac-modules/:id", () => {
    let moduleId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId);
      const modules = res.body as { id: string }[];
      moduleId = modules[0].id;
    });

    it("returns the module", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac-modules/${moduleId}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body = res.body as { id: string; name: string };
      expect(body.id).toBe(moduleId);
    });

    it("returns 404 for unknown ID", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/iac-modules/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(404);
    });
  });

  describe("PATCH /api/v1/iac-modules/:id", () => {
    let moduleId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId);
      const modules = res.body as { id: string }[];
      moduleId = modules[0].id;
    });

    it("updates the module description", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/iac-modules/${moduleId}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .send({ description: "Updated description" })
        .expect(200);

      const body = res.body as { description: string };
      expect(body.description).toBe("Updated description");
    });
  });

  describe("POST /api/v1/iac-modules/:id/link-component", () => {
    let moduleId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId);
      const modules = res.body as { id: string }[];
      moduleId = modules[0].id;
    });

    it("links the module to a component", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/iac-modules/${moduleId}/link-component`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .send({ componentId: "comp-test-uuid" })
        .expect(200);

      const body = res.body as { componentId: string };
      expect(body.componentId).toBe("comp-test-uuid");
    });
  });

  describe("DELETE /api/v1/iac-modules/:id/unlink-component", () => {
    let moduleId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId);
      const modules = res.body as { id: string }[];
      moduleId = modules[0].id;
    });

    it("removes the component association", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/iac-modules/${moduleId}/unlink-component`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body = res.body as { componentId: string | null };
      expect(body.componentId).toBeNull();
    });
  });

  describe("GET /api/v1/iac-modules/versions", () => {
    let moduleId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId);
      const modules = res.body as { id: string }[];
      moduleId = modules[0].id;
    });

    it("returns empty versions list for a new module", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac-modules/${moduleId}/versions`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("DELETE /api/v1/iac-modules/:id", () => {
    it("deletes the module and returns 204", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/iac-modules")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .send({
          name: "temp-module-to-delete",
          provider: "gcp",
          sourceRepoUrl: "https://github.com/example/temp-module",
        });

      const created = createRes.body as { id: string };

      await request(app.getHttpServer())
        .delete(`/api/v1/iac-modules/${created.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/iac-modules/${created.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(404);
    });
  });
});

describe("IaC Resource Topology (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;
  let stackId: string;

  beforeAll(async () => {
    process.env.IAC_INGEST_TOKEN = INGEST_TOKEN;
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));

    // Create a stack via run ingest which returns stackId directly
    const ingestRes = await request(app.getHttpServer())
      .post("/api/v1/iac/runs/ingest")
      .set("Authorization", `Bearer ${INGEST_TOKEN}`)
      .set("X-Organization-Id", organizationId)
      .send({
        stackName: "resource-map-test",
        environment: "staging",
        type: "plan",
        status: "succeeded",
        startedAt: "2024-01-01T10:00:00Z",
      })
      .expect(201);

    stackId = (ingestRes.body as { stackId: string }).stackId;
  });

  afterAll(async () => {
    delete process.env.IAC_INGEST_TOKEN;
    await app.close();
  });

  describe("POST /api/v1/iac/stacks/:id/resources/ingest", () => {
    it("returns 401 for an invalid ingest token", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/iac/stacks/${stackId}/resources/ingest`)
        .set("Authorization", "Bearer wrong-token")
        .send({ resources: [], dependencies: [] })
        .expect(401);
    });

    it("returns 404 when the stack does not exist", async () => {
      await request(app.getHttpServer())
        .post(
          "/api/v1/iac/stacks/00000000-0000-0000-0000-000000000000/resources/ingest",
        )
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send({ resources: [], dependencies: [] })
        .expect(404);
    });

    it("returns 201 and persists resources atomically (ST404)", async () => {
      const payload = {
        resources: [
          {
            address: "aws_instance.web",
            resourceType: "aws_instance",
            resourceName: "web",
            provider: "aws",
          },
          {
            address: "aws_security_group.web",
            resourceType: "aws_security_group",
            resourceName: "web",
            provider: "aws",
          },
        ],
        dependencies: [
          { source: "aws_instance.web", target: "aws_security_group.web" },
        ],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/iac/stacks/${stackId}/resources/ingest`)
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(payload)
        .expect(201);
    });

    it("replaces existing topology on second ingest (ST404 atomicity)", async () => {
      const first = {
        resources: [
          {
            address: "old_resource.a",
            resourceType: "old_type",
            resourceName: "a",
            provider: "aws",
          },
        ],
        dependencies: [],
      };
      const second = {
        resources: [
          {
            address: "new_resource.b",
            resourceType: "new_type",
            resourceName: "b",
            provider: "aws",
          },
        ],
        dependencies: [],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/iac/stacks/${stackId}/resources/ingest`)
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(first)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/iac/stacks/${stackId}/resources/ingest`)
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(second)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackId}/resources`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body739 = res.body as { resources: { address: string }[] };
      const addresses = body739.resources.map(
        (r: { address: string }) => r.address,
      );
      expect(addresses).not.toContain("old_resource.a");
      expect(addresses).toContain("new_resource.b");
    });
  });

  describe("GET /api/v1/iac/stacks/:id/resources", () => {
    it("returns 401 when not authenticated", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackId}/resources`)
        .expect(401);
    });

    it("returns 404 when the stack does not exist", async () => {
      await request(app.getHttpServer())
        .get(
          "/api/v1/iac/stacks/00000000-0000-0000-0000-000000000000/resources",
        )
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(404);
    });

    it("returns 200 with resources and dependencies in expected DTO shape", async () => {
      const ingest = {
        resources: [
          {
            address: "aws_vpc.main",
            resourceType: "aws_vpc",
            resourceName: "main",
            provider: "aws",
          },
        ],
        dependencies: [],
      };

      await request(app.getHttpServer())
        .post(`/api/v1/iac/stacks/${stackId}/resources/ingest`)
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .send(ingest)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${stackId}/resources`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const resBody = res.body as {
        resources: {
          address: string;
          resourceType: string;
          resourceName: string;
          provider: string;
        }[];
        dependencies: unknown[];
      };
      expect(resBody).toHaveProperty("resources");
      expect(resBody).toHaveProperty("dependencies");
      expect(Array.isArray(resBody.resources)).toBe(true);
      expect(resBody.resources[0]).toMatchObject({
        address: "aws_vpc.main",
        resourceType: "aws_vpc",
        resourceName: "main",
        provider: "aws",
      });
    });

    it("returns empty resource map before any ingest (ST405)", async () => {
      // Create a fresh stack with no topology via run ingest
      const ingestRes = await request(app.getHttpServer())
        .post("/api/v1/iac/runs/ingest")
        .set("Authorization", `Bearer ${INGEST_TOKEN}`)
        .set("X-Organization-Id", organizationId)
        .send({
          stackName: "empty-resource-stack",
          environment: "dev",
          type: "plan",
          status: "succeeded",
          startedAt: "2024-01-01T10:00:00Z",
        })
        .expect(201);

      const emptyStackId = (ingestRes.body as { stackId: string }).stackId;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/iac/stacks/${emptyStackId}/resources`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const emptyBody = res.body as {
        resources: unknown[];
        dependencies: unknown[];
      };
      expect(emptyBody.resources).toHaveLength(0);
      expect(emptyBody.dependencies).toHaveLength(0);
    });
  });
});
