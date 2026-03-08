import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface ComponentResponse {
  id: string;
  name: string;
  kind: string;
  owner: string;
}

describe("Catalog YAML Registration (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should register a component via valid YAML content", async () => {
    const yamlContent = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: yaml-registered-service
  description: Registered via YAML
  tags:
    - java
    - microservice
spec:
  type: service
  owner: platform-team
  lifecycle: production
`;

    const res = await request(app.getHttpServer())
      .post("/api/catalog/register-yaml")
      .set("Authorization", `Bearer ${token}`)
      .send({ yaml: yamlContent })
      .expect(201);

    const component = res.body as ComponentResponse;
    expect(component.id).toBeDefined();
    expect(component.name).toBe("yaml-registered-service");
    expect(component.kind).toBe("service");
    expect(component.owner).toBe("platform-team");

    // Verify the component appears in the catalog listing
    const listRes = await request(app.getHttpServer())
      .get("/api/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const listBody = listRes.body as {
      data: ComponentResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(
      listBody.data.some((c) => c.name === "yaml-registered-service"),
    ).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
  });

  it("should reject YAML with missing kind: Component", async () => {
    const invalidYaml = `
apiVersion: farm.io/v1alpha1
kind: Template
metadata:
  name: some-template
spec:
  owner: team
`;

    await request(app.getHttpServer())
      .post("/api/catalog/register-yaml")
      .set("Authorization", `Bearer ${token}`)
      .send({ yaml: invalidYaml })
      .expect(400);
  });

  it("should reject YAML with missing required fields (name, owner)", async () => {
    const incompleteYaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  description: No name or owner
spec:
  type: service
`;

    await request(app.getHttpServer())
      .post("/api/catalog/register-yaml")
      .set("Authorization", `Bearer ${token}`)
      .send({ yaml: incompleteYaml })
      .expect(400);
  });

  it("should reject an empty yaml field", async () => {
    await request(app.getHttpServer())
      .post("/api/catalog/register-yaml")
      .set("Authorization", `Bearer ${token}`)
      .send({ yaml: "" })
      .expect(400);
  });
});
