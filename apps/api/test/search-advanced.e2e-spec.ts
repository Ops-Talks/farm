import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../src/modules/auth/entities/user.entity";

/**
 * E2E tests for the Advanced Search endpoints (FARM-S316 / FARM-S317).
 *
 * ELASTICSEARCH_URL is intentionally unset in tests, so every search
 * falls back to the PostgreSQL ILIKE path and source will be 'database'.
 */
describe("Advanced Search (e2e)", () => {
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

  // ---------------------------------------------------------------------------
  // GET /api/v1/search/advanced
  // ---------------------------------------------------------------------------

  it("returns 400 when q query parameter is missing", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/search/advanced")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(400);
  });

  it("returns 400 when q is shorter than 2 characters", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/search/advanced?q=a")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(400);
  });

  it("returns 200 with valid shape { hits, total, page, limit, facets, source } for a valid query", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/search/advanced?q=test")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const body = res.body as {
      hits: unknown[];
      total: number;
      page: number;
      limit: number;
      facets: { types: unknown[]; tags: unknown[] };
      source: string;
    };

    expect(Array.isArray(body.hits)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(typeof body.page).toBe("number");
    expect(typeof body.limit).toBe("number");
    expect(body.facets).toBeDefined();
    expect(Array.isArray(body.facets.types)).toBe(true);
    expect(Array.isArray(body.facets.tags)).toBe(true);
    expect(body.source).toBeDefined();
  });

  it("returns source='database' when ELASTICSEARCH_URL is not set", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/search/advanced?q=platform")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((res.body as { source: string }).source).toBe("database");
  });

  it("returns 401 when no auth token is supplied", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/search/advanced?q=test")
      .expect(401);
  });

  it("accepts a single string value for types and coerces it to an array", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/search/advanced?q=platform&types=component")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const body = res.body as { hits: unknown[]; source: string };
    expect(body.source).toBeDefined();
    expect(Array.isArray(body.hits)).toBe(true);
  });

  it("accepts multiple types values and a single tags value", async () => {
    const res = await request(app.getHttpServer())
      .get(
        "/api/v1/search/advanced?q=platform&types=component&types=team&tags=api",
      )
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    expect((res.body as { source: string }).source).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // PATCH + GET /api/v1/search/config
  // ---------------------------------------------------------------------------

  it("PATCH /search/config upserts config and GET /search/config returns it", async () => {
    const patchRes = await request(app.getHttpServer())
      .patch("/api/v1/search/config")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ titleBoost: 5, tagsBoost: 3, fuzziness: "1" })
      .expect(200);

    const saved = patchRes.body as {
      id: string;
      titleBoost: number;
      tagsBoost: number;
      fuzziness: string;
    };
    expect(saved.id).toBeDefined();
    expect(saved.titleBoost).toBe(5);
    expect(saved.tagsBoost).toBe(3);
    expect(saved.fuzziness).toBe("1");

    const getRes = await request(app.getHttpServer())
      .get("/api/v1/search/config")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const fetched = getRes.body as {
      id: string;
      titleBoost: number;
      fuzziness: string;
    };
    expect(fetched.id).toBe(saved.id);
    expect(fetched.titleBoost).toBe(5);
    expect(fetched.fuzziness).toBe("1");
  });

  it("non-admin user cannot PATCH /search/config (403)", async () => {
    // Register a second user without admin promotion
    const regular = {
      username: "regular-user-s316",
      email: "regular-s316@e2e-test.com",
      password: "TestPassword1",
      displayName: "Regular User",
    };

    const searchUserRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await searchUserRepo.save(
      searchUserRepo.create({ ...regular, roles: ["user"] }),
    );

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: regular.username, password: regular.password })
      .expect(200);

    const regularToken = (loginRes.body as { token: string }).token;

    await request(app.getHttpServer())
      .patch("/api/v1/search/config")
      .set("Authorization", `Bearer ${regularToken}`)
      .set("X-Organization-Id", organizationId)
      .send({ titleBoost: 10 })
      .expect(403);
  });

  it("non-admin user cannot GET /search/config (403)", async () => {
    // Use the same non-admin user registered in the previous test
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "regular-user-s316", password: "TestPassword1" })
      .expect(200);

    const regularToken = (loginRes.body as { token: string }).token;

    // Promote to non-admin explicitly ensures roles array has no 'admin'
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepo.update(
      { username: "regular-user-s316" },
      { roles: ["user"] },
    );

    await request(app.getHttpServer())
      .get("/api/v1/search/config")
      .set("Authorization", `Bearer ${regularToken}`)
      .set("X-Organization-Id", organizationId)
      .expect(403);
  });
});
