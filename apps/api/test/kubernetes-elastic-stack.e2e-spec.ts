import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

/**
 * E2E tests for the Elastic Stack discovery endpoints (Phase 31).
 *
 * These tests run against an in-memory SQLite database with no real Kubernetes
 * cluster configured. The KubernetesService disables itself gracefully in that
 * scenario, so every sub-discovery method returns safe empty defaults.
 * ELASTICSEARCH_URL is not set in the test environment, so the external probe
 * also returns { reachable: false }.
 */
describe("Kubernetes Elastic Stack (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    const auth = await registerAndLogin(app);
    token = auth.token;
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // Authentication guard
  // -------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/elastic-stack — 401 without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/kubernetes/elastic-stack")
      .expect(401);
  });

  // -------------------------------------------------------------------------
  // Happy path — no cluster configured
  // -------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/elastic-stack — 200 with token, returns full structure when no cluster", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/elastic-stack")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      eck: {
        elasticsearch: [],
        kibana: [],
        logstash: [],
        beats: [],
      },
      inCluster: {
        fluentBit: [],
        fluentd: [],
        logstash: [],
      },
      external: {
        reachable: false,
      },
    });
  });

  // -------------------------------------------------------------------------
  // Namespace-scoped query — no cluster configured
  // -------------------------------------------------------------------------

  it("GET /api/v1/kubernetes/elastic-stack?namespace=default — 200, returns same structure with namespace filter", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/kubernetes/elastic-stack?namespace=default")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      eck: {
        elasticsearch: [],
        kibana: [],
        logstash: [],
        beats: [],
      },
      inCluster: {
        fluentBit: [],
        fluentd: [],
        logstash: [],
      },
      external: {
        reachable: false,
      },
    });
  });
});
