import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface ComponentResponse {
  id: string;
  name: string;
  kind: string;
  owner: string;
  containerImage?: {
    registry: string;
    image: string;
    latestTag?: string;
    digest?: string;
    pushedAt?: string;
  } | null;
}

describe("Catalog — container image endpoint (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;
  let componentId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));

    // Create a component to use across the tests
    const res = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "container-image-e2e-service",
        kind: "service",
        owner: "platform-team",
        description: "Service used for container-image e2e tests",
        lifecycle: "experimental",
      })
      .expect(201);

    componentId = (res.body as ComponentResponse).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/v1/catalog/components/:id/container-image — returns 200 with updated component", async () => {
    const dto = {
      registry: "ecr",
      image: "123456789.dkr.ecr.us-east-1.amazonaws.com/my-service",
      latestTag: "2.0.0",
      digest: "sha256:deadbeef",
      pushedAt: "2024-06-01T12:00:00Z",
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${componentId}/container-image`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(dto)
      .expect(200);

    const body = res.body as ComponentResponse;
    expect(body.id).toBe(componentId);
    expect(body.containerImage).toBeDefined();
    expect(body.containerImage?.registry).toBe("ecr");
    expect(body.containerImage?.image).toBe(
      "123456789.dkr.ecr.us-east-1.amazonaws.com/my-service",
    );
    expect(body.containerImage?.latestTag).toBe("2.0.0");
    expect(body.containerImage?.digest).toBe("sha256:deadbeef");
  });

  it("POST /api/v1/catalog/components/:id/container-image — persists and can be retrieved via GET", async () => {
    const dto = {
      registry: "gcr",
      image: "gcr.io/my-project/my-service",
      latestTag: "3.1.0",
    };

    await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${componentId}/container-image`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send(dto)
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/catalog/components/${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const body = getRes.body as ComponentResponse;
    expect(body.containerImage?.registry).toBe("gcr");
    expect(body.containerImage?.latestTag).toBe("3.1.0");
  });

  it("POST /api/v1/catalog/components/:id/container-image — returns 401 when unauthenticated", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${componentId}/container-image`)
      .send({ registry: "ecr", image: "myapp" })
      .expect(401);
  });

  it("POST /api/v1/catalog/components/:id/container-image — returns 404 for non-existent component", async () => {
    await request(app.getHttpServer())
      .post(
        "/api/v1/catalog/components/00000000-0000-0000-0000-000000000000/container-image",
      )
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ registry: "ecr", image: "myapp" })
      .expect(404);
  });

  it("POST /api/v1/catalog/components/:id/container-image — returns 400 when required fields are missing", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/catalog/components/${componentId}/container-image`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ latestTag: "1.0.0" }) // missing registry and image
      .expect(400);
  });
});
