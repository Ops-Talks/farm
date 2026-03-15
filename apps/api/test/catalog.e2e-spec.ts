import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface ComponentResponse {
  id: string;
  name: string;
  kind: string;
  owner: string;
  description?: string;
  lifecycle?: string;
  tags?: string[];
}

describe("Catalog CRUD (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full CRUD lifecycle: create -> list -> get -> update -> delete -> 404", async () => {
    // Step 1: Create a component
    const createDto = {
      name: "e2e-test-service",
      kind: "service",
      owner: "platform-team",
      description: "E2E test service",
      lifecycle: "experimental",
      tags: ["e2e", "test"],
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send(createDto)
      .expect(201);

    const created = createRes.body as ComponentResponse;
    expect(created.id).toBeDefined();
    expect(created.name).toBe(createDto.name);
    expect(created.kind).toBe(createDto.kind);
    expect(created.owner).toBe(createDto.owner);
    expect(created.description).toBe(createDto.description);

    const componentId = created.id;

    // Step 2: List all components and verify the created one is present
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const listBody = listRes.body as {
      data: ComponentResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((c) => c.id === componentId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 3: Get the component by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/catalog/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const fetched = getRes.body as ComponentResponse;
    expect(fetched.id).toBe(componentId);
    expect(fetched.name).toBe(createDto.name);

    // Step 4: Update the component
    const updateDto = {
      description: "Updated E2E test service",
      lifecycle: "production",
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/catalog/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateDto)
      .expect(200);

    const updated = updateRes.body as ComponentResponse;
    expect(updated.description).toBe(updateDto.description);
    expect(updated.lifecycle).toBe(updateDto.lifecycle);

    // Step 5: Delete the component
    await request(app.getHttpServer())
      .delete(`/api/v1/catalog/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // Step 6: Confirm deletion returns 404
    await request(app.getHttpServer())
      .get(`/api/v1/catalog/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should filter components by kindGroup", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "e2e-infra-component",
        kind: "cluster",
        owner: "infra-team",
      })
      .expect(201);

    const infraRes = await request(app.getHttpServer())
      .get("/api/v1/catalog/components?kindGroup=infra")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const infraBody = infraRes.body as {
      data: ComponentResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(infraBody.data)).toBe(true);
    expect(
      infraBody.data.every((c) =>
        [
          "pipeline",
          "queue",
          "database",
          "storage",
          "cluster",
          "network",
        ].includes(c.kind),
      ),
    ).toBe(true);
    expect(infraBody.total).toBeGreaterThanOrEqual(1);
  });

  it("should reject creation with invalid kind", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "bad-kind",
        kind: "nonexistent_kind",
        owner: "team",
      })
      .expect(400);
  });
});
