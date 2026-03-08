import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { User } from "../src/auth/entities/user.entity";

describe("Plugin Manager (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    app = await createE2EApp();
    adminToken = await registerAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const CORE_PLUGIN_NAMES = [
    "core-catalog",
    "core-documentation",
    "core-auth",
    "core-environments",
    "core-teams",
  ];

  describe("GET /api/plugins", () => {
    it("should return all 5 core plugins with name, version, and description", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/plugins")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const plugins = res.body as {
        name: string;
        version: string;
        description: string;
      }[];

      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins).toHaveLength(5);

      for (const plugin of plugins) {
        expect(plugin.name).toBeDefined();
        expect(plugin.version).toBeDefined();
        expect(plugin.description).toBeDefined();
      }

      const returnedNames = plugins.map((p) => p.name).sort();
      expect(returnedNames).toEqual([...CORE_PLUGIN_NAMES].sort());
    });

    it("should include core-catalog with correct metadata", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/plugins")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const plugins = res.body as {
        name: string;
        version: string;
        description: string;
      }[];

      const catalog = plugins.find((p) => p.name === "core-catalog");
      expect(catalog).toBeDefined();
      expect(catalog!.version).toBe("1.0.0");
      expect(catalog!.description).toBe("Software catalog management");
    });

    it("should reject unauthenticated requests", async () => {
      await request(app.getHttpServer()).get("/api/plugins").expect(401);
    });

    it("should reject non-admin users", async () => {
      const userToken = await registerAndLogin(app, {
        username: "plugin_viewer",
        email: "plugin_viewer@test.com",
        password: "ViewerPass1",
        displayName: "Plugin Viewer",
      });

      // Demote user back to regular role
      const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
      await userRepo.update(
        { username: "plugin_viewer" },
        { roles: ["viewer"] },
      );

      // Re-login to get a token reflecting the demoted role
      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ username: "plugin_viewer", password: "ViewerPass1" })
        .expect(200);

      const viewerToken = (loginRes.body as { token: string }).token;

      await request(app.getHttpServer())
        .get("/api/plugins")
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  // The controller does not expose a GET /api/plugins/:name endpoint.
  // Requests to unmatched paths under /api/plugins return 404.
  describe("GET /api/plugins/:name (non-existent route)", () => {
    it("should return 404 for an unknown sub-path", async () => {
      await request(app.getHttpServer())
        .get("/api/plugins/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("GET /api/plugins/menu-items", () => {
    it("should return an array of menu items", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/plugins/menu-items")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/plugins/routes", () => {
    it("should return an array of route contributions", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/plugins/routes")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
