import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface ComponentResponse {
  id: string;
  name: string;
}

interface EnvironmentResponse {
  id: string;
  name: string;
}

interface DeploymentResponse {
  id: string;
  version: string;
  status: string;
  componentId: string;
  environmentId: string;
  deployedBy?: string;
}

describe("Deployments Lifecycle (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let componentId: string;
  let environmentId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);

    // Create prerequisite component
    const compRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "deploy-e2e-service",
        kind: "service",
        owner: "platform-team",
        lifecycle: "production",
      })
      .expect(201);
    componentId = (compRes.body as ComponentResponse).id;

    // Create prerequisite environment
    const envRes = await request(app.getHttpServer())
      .post("/api/v1/environments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "deploy-e2e-staging",
        type: "staging",
      })
      .expect(201);
    environmentId = (envRes.body as EnvironmentResponse).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the deployment lifecycle: create -> update status -> get latest", async () => {
    // Step 1: Create a deployment (starts as pending)
    const createDto = {
      componentId,
      environmentId,
      version: "v1.0.0",
      deployedBy: "ci-bot",
      description: "E2E test deployment",
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/v1/deployments")
      .set("Authorization", `Bearer ${token}`)
      .send(createDto)
      .expect(201);

    const created = createRes.body as DeploymentResponse;
    expect(created.id).toBeDefined();
    expect(created.version).toBe(createDto.version);
    expect(created.status).toBe("pending");
    expect(created.componentId).toBe(componentId);
    expect(created.environmentId).toBe(environmentId);

    const deploymentId = created.id;

    // Step 2: Transition to in_progress
    const progressRes = await request(app.getHttpServer())
      .patch(`/api/v1/deployments/${deploymentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "in_progress" })
      .expect(200);

    expect((progressRes.body as DeploymentResponse).status).toBe("in_progress");

    // Step 3: Transition to succeeded
    const successRes = await request(app.getHttpServer())
      .patch(`/api/v1/deployments/${deploymentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "succeeded",
        finishedAt: new Date().toISOString(),
      })
      .expect(200);

    expect((successRes.body as DeploymentResponse).status).toBe("succeeded");

    // Step 4: Get deployment by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/deployments/${deploymentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const fetched = getRes.body as DeploymentResponse;
    expect(fetched.status).toBe("succeeded");
    expect(fetched.version).toBe("v1.0.0");

    // Step 5: List deployments with filters
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/deployments?componentId=${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const listBody = listRes.body as {
      data: DeploymentResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((d) => d.id === deploymentId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 6: Get latest deployment per environment
    const latestRes = await request(app.getHttpServer())
      .get(`/api/v1/deployments/latest?componentId=${componentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const latestDeployments = latestRes.body as DeploymentResponse[];
    expect(Array.isArray(latestDeployments)).toBe(true);
  });

  it("should reject invalid status transitions", async () => {
    // Create a fresh deployment (status: pending)
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/deployments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        componentId,
        environmentId,
        version: "v2.0.0",
      })
      .expect(201);

    const deploymentId = (createRes.body as DeploymentResponse).id;

    // Try to go directly from pending to succeeded (invalid: must go through in_progress)
    await request(app.getHttpServer())
      .patch(`/api/v1/deployments/${deploymentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "succeeded" })
      .expect(400);
  });

  it("should reject deployment with invalid component/environment IDs", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/deployments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        componentId: "00000000-0000-0000-0000-000000000000",
        environmentId: "00000000-0000-0000-0000-000000000000",
        version: "v1.0.0",
      })
      .expect(404);
  });
});
