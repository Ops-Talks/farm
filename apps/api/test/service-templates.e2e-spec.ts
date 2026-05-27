import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface TemplateResponse {
  id: string;
  name: string;
  description?: string;
  language: string;
  framework: string;
  tags?: string[];
  repositoryUrl: string;
  isBuiltIn: boolean;
  organizationId?: string;
}

interface ScaffoldResponse {
  id: string;
  templateId: string;
  templateName: string;
  targetRepository: string;
  status: string;
  dryRun: boolean;
  renderedFiles?: string[];
}

describe("Service Templates CRUD (e2e)", () => {
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

  it("should seed built-in templates on startup", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/service-templates")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const body = res.body as { data: TemplateResponse[]; total: number };
    expect(body.total).toBeGreaterThanOrEqual(4);
    expect(body.data.some((t) => t.name === "nestjs-api")).toBe(true);
    expect(body.data.some((t) => t.name === "nextjs-app")).toBe(true);
    expect(body.data.some((t) => t.name === "go-microservice")).toBe(true);
    expect(body.data.some((t) => t.name === "python-worker")).toBe(true);
  });

  it("should complete the full template lifecycle: create -> list -> get -> update -> scaffold -> dry-run -> delete", async () => {
    // Step 1: Create a custom template
    const createDto = {
      name: "e2e-custom-template",
      description: "E2E test template",
      language: "typescript",
      framework: "express",
      tags: ["api", "test"],
      repositoryUrl: "https://github.com/test/express-template",
      isBuiltIn: false,
      variables: [
        {
          key: "SERVICE_NAME",
          label: "Service Name",
          description: "Name of the service",
          required: true,
        },
        {
          key: "PORT",
          label: "Port",
          description: "Server port",
          default: "3000",
          required: false,
        },
      ],
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/service-templates")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(createDto)
      .expect(201);

    const created = createRes.body as TemplateResponse;
    expect(created.name).toBe("e2e-custom-template");
    expect(created.language).toBe("typescript");
    expect(created.framework).toBe("express");

    // Step 2: List templates (should include the new one)
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/service-templates?language=typescript")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const listBody = listRes.body as {
      data: TemplateResponse[];
      total: number;
    };
    expect(listBody.data.some((t) => t.name === "e2e-custom-template")).toBe(
      true,
    );

    // Step 3: Get by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/service-templates/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((getRes.body as TemplateResponse).name).toBe("e2e-custom-template");

    // Step 4: Update
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/service-templates/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ description: "Updated description" })
      .expect(200);

    expect((updateRes.body as TemplateResponse).description).toBe(
      "Updated description",
    );

    // Step 5: Dry-run scaffold
    const dryRunRes = await request(app.getHttpServer())
      .post(`/api/v1/service-templates/${created.id}/scaffold/dry-run`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        targetRepository: "org/my-new-service",
        variables: { SERVICE_NAME: "my-svc", PORT: "8080" },
      })
      .expect(201);

    const dryRun = dryRunRes.body as ScaffoldResponse;
    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.status).toBe("completed");
    expect(dryRun.renderedFiles).toBeDefined();
    expect(Array.isArray(dryRun.renderedFiles)).toBe(true);

    // Step 6: Full scaffold
    const scaffoldRes = await request(app.getHttpServer())
      .post(`/api/v1/service-templates/${created.id}/scaffold`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        targetRepository: "org/my-new-service-2",
        variables: { SERVICE_NAME: "my-svc-2" },
      })
      .expect(201);

    const scaffold = scaffoldRes.body as ScaffoldResponse;
    expect(scaffold.dryRun).toBe(false);
    expect(scaffold.status).toBe("completed");

    // Step 7: Delete the custom template
    await request(app.getHttpServer())
      .delete(`/api/v1/service-templates/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Verify deletion
    await request(app.getHttpServer())
      .get(`/api/v1/service-templates/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });

  it("should reject duplicate template names", async () => {
    const createDto = {
      name: "e2e-dup-template",
      language: "go",
      framework: "gin",
      repositoryUrl: "https://github.com/test/gin-template",
    };

    await request(app.getHttpServer())
      .post("/api/v1/service-templates")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(createDto)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/service-templates")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(createDto)
      .expect(409);
  });

  it("should return 400 for scaffold with missing required variables", async () => {
    // Get a built-in template that has required variables
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/service-templates")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const body = listRes.body as { data: TemplateResponse[] };
    const nestTemplate = body.data.find((t) => t.name === "nestjs-api");
    expect(nestTemplate).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/service-templates/${nestTemplate!.id}/scaffold`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        targetRepository: "org/missing-vars",
        variables: {},
      })
      .expect(400);
  });
});
