import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

const OPENAPI_SPEC_V1 = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: List users
      responses:
        "200":
          description: OK
`.trim();

const OPENAPI_SPEC_V2 = `
openapi: "3.0.0"
info:
  title: Test API
  version: "2.0.0"
paths:
  /users:
    get:
      summary: List users
      responses:
        "200":
          description: OK
  /users/{id}:
    get:
      summary: Get user
      responses:
        "200":
          description: OK
`.trim();

interface ApiSpecResponse {
  id: string;
  componentId: string;
  name: string;
  format: string;
  version: string;
  spec: string;
  status: string;
  deprecatedAt: string | null;
  sunsetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiConsumerResponse {
  id: string;
  apiSpecId: string;
  consumerComponentId: string | null;
  consumerTeamId: string | null;
  addedAt: string;
}

interface ComponentResponse {
  id: string;
  name: string;
  kind: string;
  owner: string;
}

describe("API Specs (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full API catalog lifecycle", async () => {
    // -------------------------------------------------------------------------
    // Step 1: Create a catalog component to own the specs
    // -------------------------------------------------------------------------
    const compRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "api-spec-e2e-service",
        kind: "service",
        owner: "platform-team",
        description: "Service for API spec E2E tests",
        lifecycle: "experimental",
      })
      .expect(201);

    const component = compRes.body as ComponentResponse;
    expect(component.id).toBeDefined();
    const componentId = component.id;

    // Create a second component to act as a consumer
    const consumerCompRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "api-consumer-service",
        kind: "service",
        owner: "platform-team",
        lifecycle: "experimental",
      })
      .expect(201);

    const consumerComponent = consumerCompRes.body as ComponentResponse;
    const consumerComponentId = consumerComponent.id;

    // -------------------------------------------------------------------------
    // Step 2: POST /api/v1/catalog/components/:id/api-specs
    // -------------------------------------------------------------------------
    const createSpecRes = await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${componentId}/api-specs`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Users API v1",
        format: "openapi",
        version: "1.0.0",
        spec: OPENAPI_SPEC_V1,
      })
      .expect(201);

    const spec1 = createSpecRes.body as ApiSpecResponse;
    expect(spec1.id).toBeDefined();
    expect(spec1.name).toBe("Users API v1");
    expect(spec1.format).toBe("openapi");
    expect(spec1.version).toBe("1.0.0");
    expect(spec1.status).toBe("active");
    expect(spec1.componentId).toBe(componentId);
    const specId = spec1.id;

    // Create a second spec for diff comparison
    const createSpec2Res = await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${componentId}/api-specs`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Users API v2",
        format: "openapi",
        version: "2.0.0",
        spec: OPENAPI_SPEC_V2,
      })
      .expect(201);

    const spec2 = createSpec2Res.body as ApiSpecResponse;
    const specId2 = spec2.id;

    // -------------------------------------------------------------------------
    // Step 3: GET /api/v1/catalog/components/:id/api-specs
    // -------------------------------------------------------------------------
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/catalog/components/${componentId}/api-specs`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const specs = listRes.body as ApiSpecResponse[];
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBeGreaterThanOrEqual(2);
    expect(specs.some((s) => s.id === specId)).toBe(true);

    // -------------------------------------------------------------------------
    // Step 4: GET /api/v1/api-specs/:specId
    // -------------------------------------------------------------------------
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/api-specs/${specId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const fetched = getRes.body as ApiSpecResponse;
    expect(fetched.id).toBe(specId);
    expect(fetched.name).toBe("Users API v1");

    // -------------------------------------------------------------------------
    // Step 5: PATCH /api/v1/api-specs/:specId — update status to deprecated
    // -------------------------------------------------------------------------
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/api-specs/${specId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "deprecated" })
      .expect(200);

    const patched = patchRes.body as ApiSpecResponse;
    expect(patched.status).toBe("deprecated");
    expect(patched.deprecatedAt).toBeDefined();
    expect(patched.deprecatedAt).not.toBeNull();

    // -------------------------------------------------------------------------
    // Step 6: GET /api/v1/api-specs/:specId/diff?compareWith=:specId2
    // -------------------------------------------------------------------------
    const diffRes = await request(app.getHttpServer())
      .get(`/api/v1/api-specs/${specId}/diff?compareWith=${specId2}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const diffResult = diffRes.body as {
      totalChanges: number;
      breakingChanges: number;
      entries: unknown[];
    };
    expect(typeof diffResult.totalChanges).toBe("number");
    expect(typeof diffResult.breakingChanges).toBe("number");
    expect(Array.isArray(diffResult.entries)).toBe(true);
    // v1 -> v2 adds /users/{id} path (non-breaking)
    expect(diffResult.totalChanges).toBeGreaterThan(0);
    expect(diffResult.breakingChanges).toBe(0);

    // -------------------------------------------------------------------------
    // Step 7: POST /api/v1/api-specs/:specId/consumers
    // -------------------------------------------------------------------------
    const addConsumerRes = await request(app.getHttpServer())
      .post(`/api/v1/api-specs/${specId}/consumers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ consumerComponentId: consumerComponentId })
      .expect(201);

    const consumer = addConsumerRes.body as ApiConsumerResponse;
    expect(consumer.id).toBeDefined();
    expect(consumer.apiSpecId).toBe(specId);
    expect(consumer.consumerComponentId).toBe(consumerComponentId);
    const consumerId = consumer.id;

    // -------------------------------------------------------------------------
    // Step 8: GET /api/v1/catalog/components/:id/consumed-apis
    // -------------------------------------------------------------------------
    const consumedRes = await request(app.getHttpServer())
      .get(`/api/v1/catalog/components/${consumerComponentId}/consumed-apis`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const consumedApis = consumedRes.body as ApiSpecResponse[];
    expect(Array.isArray(consumedApis)).toBe(true);
    expect(consumedApis.some((s) => s.id === specId)).toBe(true);

    // -------------------------------------------------------------------------
    // Step 9: DELETE /api/v1/api-specs/:specId/consumers/:consumerId
    // -------------------------------------------------------------------------
    await request(app.getHttpServer())
      .delete(`/api/v1/api-specs/${specId}/consumers/${consumerId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // Verify consumer removed
    const consumedAfterDelete = await request(app.getHttpServer())
      .get(`/api/v1/catalog/components/${consumerComponentId}/consumed-apis`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const remainingConsumed = consumedAfterDelete.body as ApiSpecResponse[];
    expect(remainingConsumed.some((s) => s.id === specId)).toBe(false);

    // -------------------------------------------------------------------------
    // Step 10: DELETE /api/v1/api-specs/:specId → 204
    // -------------------------------------------------------------------------
    await request(app.getHttpServer())
      .delete(`/api/v1/api-specs/${specId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // Verify deleted
    await request(app.getHttpServer())
      .get(`/api/v1/api-specs/${specId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should return 404 when getting a non-existent spec", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/api-specs/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should return 400 for invalid create payload", async () => {
    // Need a component first
    const compRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "validation-test-service",
        kind: "service",
        owner: "platform-team",
        lifecycle: "experimental",
      })
      .expect(201);

    const comp = compRes.body as ComponentResponse;

    await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${comp.id}/api-specs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", format: "invalid-format", version: "", spec: "" })
      .expect(400);
  });
});
