import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface ComponentResponse {
  id: string;
  name: string;
}

interface DocumentationResponse {
  id: string;
  title: string;
  sourceUrl: string;
  componentId: string;
  author: string;
  version: string;
}

describe("Documentation CRUD (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let componentId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);

    // Create a component to associate documentation with
    const compRes = await request(app.getHttpServer())
      .post("/api/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "docs-e2e-service",
        kind: "service",
        owner: "platform-team",
      })
      .expect(201);

    componentId = (compRes.body as ComponentResponse).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full documentation lifecycle: create -> get -> update -> delete", async () => {
    // Step 1: Create documentation
    const createDto = {
      title: "Getting Started Guide",
      sourceUrl: "https://raw.example.com/docs/getting-started.md",
      componentId,
      author: "e2e-admin",
      version: "1.0.0",
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/docs")
      .set("Authorization", `Bearer ${token}`)
      .send(createDto)
      .expect(201);

    const created = createRes.body as DocumentationResponse;
    expect(created.id).toBeDefined();
    expect(created.title).toBe(createDto.title);
    expect(created.sourceUrl).toBe(createDto.sourceUrl);
    expect(created.componentId).toBe(componentId);
    expect(created.author).toBe(createDto.author);
    expect(created.version).toBe(createDto.version);

    const docId = created.id;

    // Step 2: Get documentation metadata by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const fetched = getRes.body as DocumentationResponse;
    expect(fetched.id).toBe(docId);
    expect(fetched.title).toBe(createDto.title);

    // Step 3: List all documentation
    const listRes = await request(app.getHttpServer())
      .get("/api/docs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const docs = listRes.body as DocumentationResponse[];
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.some((d) => d.id === docId)).toBe(true);

    // Step 4: Filter documentation by componentId
    const filteredRes = await request(app.getHttpServer())
      .get(`/api/docs?componentId=${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const filteredDocs = filteredRes.body as DocumentationResponse[];
    expect(filteredDocs.every((d) => d.componentId === componentId)).toBe(true);

    // Step 5: Update documentation
    const updateDto = {
      title: "Updated Getting Started Guide",
      version: "2.0.0",
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateDto)
      .expect(200);

    const updated = updateRes.body as DocumentationResponse;
    expect(updated.title).toBe(updateDto.title);
    expect(updated.version).toBe(updateDto.version);

    // Step 6: Delete documentation
    await request(app.getHttpServer())
      .delete(`/api/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // Step 7: Confirm deletion returns 404
    await request(app.getHttpServer())
      .get(`/api/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should reject creation with missing required fields", async () => {
    await request(app.getHttpServer())
      .post("/api/docs")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Incomplete" })
      .expect(400);
  });

  it("should reject creation with invalid sourceUrl", async () => {
    await request(app.getHttpServer())
      .post("/api/docs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Bad URL Doc",
        sourceUrl: "not-a-url",
        componentId,
        author: "tester",
        version: "1.0.0",
      })
      .expect(400);
  });
});
