import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface EnvironmentResponse {
  id: string;
  name: string;
  type: string;
  description?: string;
  order?: number;
}

describe("Environments CRUD (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full environment lifecycle: create -> list -> get -> update -> delete", async () => {
    // Step 1: Create an environment
    const createDto = {
      name: "e2e-staging",
      type: "staging",
      description: "E2E staging environment",
      order: 2,
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/environments")
      .set("Authorization", `Bearer ${token}`)
      .send(createDto)
      .expect(201);

    const created = createRes.body as EnvironmentResponse;
    expect(created.id).toBeDefined();
    expect(created.name).toBe(createDto.name);
    expect(created.type).toBe(createDto.type);
    expect(created.description).toBe(createDto.description);

    const envId = created.id;

    // Step 2: List all environments
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/environments")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const listBody = listRes.body as {
      data: EnvironmentResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((e) => e.id === envId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 3: Get by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const fetched = getRes.body as EnvironmentResponse;
    expect(fetched.id).toBe(envId);
    expect(fetched.name).toBe(createDto.name);

    // Step 4: Update the environment
    const updateDto = {
      description: "Updated E2E staging environment",
      order: 5,
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateDto)
      .expect(200);

    const updated = updateRes.body as EnvironmentResponse;
    expect(updated.description).toBe(updateDto.description);

    // Step 5: Delete the environment
    await request(app.getHttpServer())
      .delete(`/api/v1/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // Step 6: Confirm deletion returns 404
    await request(app.getHttpServer())
      .get(`/api/v1/environments/${envId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should reject duplicate environment names", async () => {
    const envDto = {
      name: "e2e-unique-env",
      type: "development",
    };

    await request(app.getHttpServer())
      .post("/api/v1/environments")
      .set("Authorization", `Bearer ${token}`)
      .send(envDto)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/environments")
      .set("Authorization", `Bearer ${token}`)
      .send(envDto)
      .expect(409);
  });

  it("should reject creation with invalid type", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/environments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "bad-type-env",
        type: "nonexistent_type",
      })
      .expect(400);
  });
});
