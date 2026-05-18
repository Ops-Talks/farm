import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { DocumentationBuildService } from "../src/modules/documentation/documentation-build.service";

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
  let organizationId: string;
  let componentId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));

    // Create a component to associate documentation with
    const compRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
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
      .post("/api/v1/docs")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
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
      .get(`/api/v1/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const fetched = getRes.body as DocumentationResponse;
    expect(fetched.id).toBe(docId);
    expect(fetched.title).toBe(createDto.title);

    // Step 3: List all documentation
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/docs")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const listBody = listRes.body as {
      data: DocumentationResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((d) => d.id === docId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 4: Filter documentation by componentId
    const filteredRes = await request(app.getHttpServer())
      .get(`/api/v1/docs?componentId=${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const filteredBody = filteredRes.body as {
      data: DocumentationResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(filteredBody.data)).toBe(true);
    expect(filteredBody.data.every((d) => d.componentId === componentId)).toBe(
      true,
    );

    // Step 5: Update documentation
    const updateDto = {
      title: "Updated Getting Started Guide",
      version: "2.0.0",
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(updateDto)
      .expect(200);

    const updated = updateRes.body as DocumentationResponse;
    expect(updated.title).toBe(updateDto.title);
    expect(updated.version).toBe(updateDto.version);

    // Step 6: Delete documentation
    await request(app.getHttpServer())
      .delete(`/api/v1/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Step 7: Confirm deletion returns 404
    await request(app.getHttpServer())
      .get(`/api/v1/docs/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });

  it("should reject creation with missing required fields", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/docs")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ title: "Incomplete" })
      .expect(400);
  });

  it("should reject creation with invalid sourceUrl", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/docs")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        title: "Bad URL Doc",
        sourceUrl: "not-a-url",
        componentId,
        author: "tester",
        version: "1.0.0",
      })
      .expect(400);
  });

  describe("GET /api/v1/docs/builds/:componentId", () => {
    let buildService: DocumentationBuildService;

    beforeAll(() => {
      buildService = app.get(DocumentationBuildService);
    });

    it("returns empty array when no builds exist for component", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/docs/builds/${componentId}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("returns 401 when not authenticated", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/docs/builds/${componentId}`)
        .expect(401);
    });

    it("returns build records seeded for the component", async () => {
      await buildService.create(componentId, "v1.0.0", "markdown");

      const res = await request(app.getHttpServer())
        .get(`/api/v1/docs/builds/${componentId}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      const build = res.body as Array<{ componentId: string; status: string }>;
      expect(build[0].componentId).toBe(componentId);
      expect(build[0].status).toBe("building");
    });
  });

  describe("org isolation", () => {
    it("should not return documentation from another organization", async () => {
      // Register second user with a distinct org
      const second = await registerAndLogin(app, {
        username: "e2e-doc-user2",
        email: "doc-user2@e2e-test.com",
      });

      // Create a catalog component inside the second org
      const compRes = await request(app.getHttpServer())
        .post("/api/v1/catalog/components")
        .set("Authorization", `Bearer ${second.token}`)
        .set("X-Organization-Id", second.organizationId)
        .send({
          name: "isolated-doc-component",
          kind: "service",
          owner: "team",
        })
        .expect(201);

      // Create a documentation entry inside the second org
      await request(app.getHttpServer())
        .post("/api/v1/docs")
        .set("Authorization", `Bearer ${second.token}`)
        .set("X-Organization-Id", second.organizationId)
        .send({
          title: "Secret Doc",
          sourceUrl: "https://raw.example.com/secret.md",
          componentId: (compRes.body as { id: string }).id,
          author: "e2e-doc-user2",
          version: "1.0.0",
        })
        .expect(201);

      // List docs as the first user scoped to their own org — must NOT see the second org's doc
      const listRes = await request(app.getHttpServer())
        .get("/api/v1/docs")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const titles = (
        listRes.body as { data: Array<{ title: string }> }
      ).data.map((d) => d.title);
      expect(titles).not.toContain("Secret Doc");
    });
  });
});
