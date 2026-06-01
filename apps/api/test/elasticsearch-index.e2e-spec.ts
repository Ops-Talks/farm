import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { User } from "../src/modules/auth/entities/user.entity";

interface ComponentResponse {
  id: string;
  name: string;
}

interface IndexLinkResponse {
  id: string;
  componentId: string;
  indexPattern: string;
  esUrl: string | null;
  description: string | null;
}

/**
 * E2E tests for the Elasticsearch Index Visibility CRUD endpoints
 * (FARM-S351 / FARM-T401).
 */
describe("ElasticsearchIndex (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;
  let componentId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));

    // Create a component to link indices to
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "es-index-e2e-component",
        kind: "service",
        owner: "platform-team",
        lifecycle: "experimental",
      })
      .expect(201);

    componentId = (createRes.body as ComponentResponse).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("links a new Elasticsearch index pattern to a component (201)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/components/${componentId}/elasticsearch-indices`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        indexPattern: "logs-app-*",
        esUrl: "https://es.example.com:9200",
        description: "Application JSON logs",
      })
      .expect(201);

    const body = res.body as IndexLinkResponse;
    expect(body.id).toBeDefined();
    expect(body.componentId).toBe(componentId);
    expect(body.indexPattern).toBe("logs-app-*");
    expect(body.esUrl).toBe("https://es.example.com:9200");
    expect(body.description).toBe("Application JSON logs");
  });

  it("lists linked indices for the component (200)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/components/${componentId}/elasticsearch-indices`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const list = res.body as IndexLinkResponse[];
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((entry) => entry.indexPattern === "logs-app-*")).toBe(
      true,
    );
  });

  it("rejects a duplicate (componentId, indexPattern) with 409", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/components/${componentId}/elasticsearch-indices`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ indexPattern: "logs-app-*" })
      .expect(409);
  });

  it("requires authentication (401)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/components/${componentId}/elasticsearch-indices`)
      .expect(401);
  });

  it("deletes an existing link (204) and removes it from the list", async () => {
    // Link a fresh index to delete
    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/components/${componentId}/elasticsearch-indices`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ indexPattern: "metrics-*" })
      .expect(201);

    const indexId = (createRes.body as IndexLinkResponse).id;

    await request(app.getHttpServer())
      .delete(
        `/api/v1/components/${componentId}/elasticsearch-indices/${indexId}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/components/${componentId}/elasticsearch-indices`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const list = listRes.body as IndexLinkResponse[];
    expect(list.some((entry) => entry.id === indexId)).toBe(false);
  });

  it("returns 404 when deleting a non-existent index id", async () => {
    await request(app.getHttpServer())
      .delete(
        `/api/v1/components/${componentId}/elasticsearch-indices/00000000-0000-0000-0000-000000000000`,
      )
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });

  // FARM-T403 — Stats endpoint
  describe("GET /elasticsearch-indices/stats", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns reachable: false for each linked record when ES is unreachable", async () => {
      // Ensure no fetch is even called when no URL is configured.
      globalThis.fetch = jest.fn();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/components/${componentId}/elasticsearch-indices/stats`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body = res.body as Array<{
        indexId: string;
        indexPattern: string;
        esUrl: string | null;
        reachable: boolean;
      }>;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      for (const entry of body) {
        // Each linked record (logs-app-* has esUrl override https://es.example.com:9200)
        // would attempt fetch; we expect reachable: false because the host is fake.
        expect(typeof entry.indexId).toBe("string");
        expect(typeof entry.indexPattern).toBe("string");
        expect(entry.reachable).toBe(false);
      }
    });

    it("returns reachable: true with mapped stats when fetch succeeds", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              index: "logs-app-2026.04.27",
              health: "green",
              status: "open",
              "docs.count": "999",
              "store.size": "5mb",
            },
          ]),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/components/${componentId}/elasticsearch-indices/stats`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(200);

      const body = res.body as Array<{
        indexId: string;
        indexPattern: string;
        esUrl: string | null;
        reachable: boolean;
        stats?: {
          pattern: string;
          index: string;
          health: string;
          status: string;
          docsCount: number;
          storeSize: string;
        };
      }>;

      expect(body.length).toBeGreaterThan(0);
      const reachable = body.find((entry) => entry.reachable);
      expect(reachable).toBeDefined();
      expect(reachable?.stats).toBeDefined();
      expect(reachable?.stats?.index).toBe("logs-app-2026.04.27");
      expect(reachable?.stats?.health).toBe("green");
      expect(reachable?.stats?.docsCount).toBe(999);
      expect(reachable?.stats?.storeSize).toBe("5mb");
    });

    it("returns 401 when unauthenticated", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/components/${componentId}/elasticsearch-indices/stats`)
        .expect(401);
    });

    it("returns 404 when the component does not exist", async () => {
      await request(app.getHttpServer())
        .get(
          `/api/v1/components/00000000-0000-0000-0000-000000000000/elasticsearch-indices/stats`,
        )
        .set("Authorization", `Bearer ${token}`)
        .set("X-Organization-Id", organizationId)
        .expect(404);
    });
  });
});

/**
 * E2E tests for the admin aggregate overview endpoint (FARM-T407).
 *
 * Uses an isolated app instance so the global non-admin negative test
 * does not interfere with the per-component test suite above.
 */
describe("GET /elasticsearch/indices (admin overview)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let organizationId: string;
  const componentIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token: adminToken, organizationId } = await registerAndLogin(app, {
      username: "es-overview-admin",
      email: "es-overview-admin@e2e-test.com",
      password: "TestPassword1",
      displayName: "ES Overview Admin",
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  const seedComponentWithIndices = async (
    name: string,
    patterns: string[],
  ): Promise<string> => {
    const compRes = await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name,
        kind: "service",
        owner: "platform-team",
        lifecycle: "experimental",
      })
      .expect(201);
    const id = (compRes.body as { id: string }).id;
    for (const pattern of patterns) {
      await request(app.getHttpServer())
        .post(`/api/v1/components/${id}/elasticsearch-indices`)
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", organizationId)
        .send({ indexPattern: pattern })
        .expect(201);
    }
    componentIds.push(id);
    return id;
  };

  it("returns [] when no records exist for the admin", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/elasticsearch/indices")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it("returns 403 when a non-admin user attempts to access the overview", async () => {
    // Register a second user without admin promotion.
    const regular = {
      username: "es-overview-regular",
      email: "es-overview-regular@e2e-test.com",
      password: "TestPassword1",
      displayName: "Regular ES User",
    };
    // Create a regular user directly (no admin promotion)
    const esUserRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await esUserRepo.save(esUserRepo.create({ ...regular, roles: ["user"] }));
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: regular.username, password: regular.password })
      .expect(200);
    const regularToken = (loginRes.body as { token: string }).token;

    await request(app.getHttpServer())
      .get("/api/v1/elasticsearch/indices")
      .set("Authorization", `Bearer ${regularToken}`)
      .expect(403);
  });

  describe("with seeded components", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeAll(async () => {
      // Two components with two index patterns each, sorted out of order
      // on purpose to verify deterministic alphabetical ordering.
      await seedComponentWithIndices("zulu-overview-svc", [
        "logs-zulu-2",
        "logs-zulu-1",
      ]);
      await seedComponentWithIndices("alpha-overview-svc", [
        "logs-alpha-2",
        "logs-alpha-1",
      ]);
    });

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns 2 sorted groups with reachable: false when ES is unreachable", async () => {
      // No ES URL configured, no per-record override -> stats service
      // short-circuits to { reachable: false } without ever calling fetch.
      globalThis.fetch = jest.fn();

      const res = await request(app.getHttpServer())
        .get("/api/v1/elasticsearch/indices")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as Array<{
        componentId: string;
        componentName: string;
        indices: Array<{
          indexId: string;
          indexPattern: string;
          esUrl: string | null;
          reachable: boolean;
          stats?: unknown;
        }>;
      }>;

      expect(body).toHaveLength(2);
      expect(body[0].componentName).toBe("alpha-overview-svc");
      expect(body[1].componentName).toBe("zulu-overview-svc");
      expect(body[0].indices.map((i) => i.indexPattern)).toEqual([
        "logs-alpha-1",
        "logs-alpha-2",
      ]);
      expect(body[1].indices.map((i) => i.indexPattern)).toEqual([
        "logs-zulu-1",
        "logs-zulu-2",
      ]);
      for (const group of body) {
        for (const entry of group.indices) {
          expect(entry.reachable).toBe(false);
          expect(entry.stats).toBeUndefined();
        }
      }
    });

    it("returns reachable: true with mapped stats when fetch succeeds", async () => {
      const fetchMock = jest.fn().mockImplementation((url: string) => {
        // Echo back one healthy index per requested pattern. The stats
        // service URL embeds the pattern in the path, so derive it back.
        const match = /\/_cat\/indices\/([^?]+)/.exec(url);
        const pattern = match ? decodeURIComponent(match[1]) : "unknown";
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                index: `${pattern}-2026.04.27`,
                health: "green",
                status: "open",
                "docs.count": "42",
                "store.size": "3mb",
              },
            ]),
        });
      });
      // Set the global ES URL so the stats service has a base URL to hit.
      process.env.ELASTICSEARCH_URL = "http://es-overview.test";
      globalThis.fetch = fetchMock;

      try {
        const res = await request(app.getHttpServer())
          .get("/api/v1/elasticsearch/indices")
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200);

        const body = res.body as Array<{
          componentName: string;
          indices: Array<{
            indexPattern: string;
            reachable: boolean;
            stats?: {
              index: string;
              health: string;
              docsCount: number;
              storeSize: string;
            };
          }>;
        }>;

        expect(body).toHaveLength(2);
        for (const group of body) {
          for (const entry of group.indices) {
            expect(entry.reachable).toBe(true);
            expect(entry.stats).toBeDefined();
            expect(entry.stats?.index).toBe(`${entry.indexPattern}-2026.04.27`);
            expect(entry.stats?.health).toBe("green");
            expect(entry.stats?.docsCount).toBe(42);
            expect(entry.stats?.storeSize).toBe("3mb");
          }
        }
      } finally {
        delete process.env.ELASTICSEARCH_URL;
      }
    });
  });
});
