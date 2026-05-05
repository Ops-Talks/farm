import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";
import { User } from "../src/modules/auth/entities/user.entity";

describe("Plugin Manager (e2e)", () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let adminOrganizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token: adminToken, organizationId: adminOrganizationId } =
      await registerAndLogin(app));
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
    "core-audit-log",
    "core-organization",
    "core-pipelines",
    "core-alerting",
    "core-integrations",
    "core-kubernetes",
    "core-analytics",
    "core-helm",
    "cloud",
    "core-tag-governance",
    "core-istio",
    "core-api-specs",
    "core-gateway",
    "core-registry",
    "core-slo",
    "core-incidents",
    "core-dashboards",
    "core-service-templates",
    "core-environment-requests",
    "core-finops",
    "core-features",
    "core-search",
    "core-setup",
    "core-linkerd",
    "core-opa",
    "core-iac",
    "core-elasticsearch",
    "core-elasticsearch-index",
    "core-scorecards",
  ];

  describe("GET /api/plugins", () => {
    it("should return all registered plugins with name, version, and description", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/plugins")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      const plugins = res.body as {
        name: string;
        version: string;
        description: string;
      }[];

      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins).toHaveLength(CORE_PLUGIN_NAMES.length);

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
        .get("/api/v1/plugins")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
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
      await request(app.getHttpServer()).get("/api/v1/plugins").expect(401);
    });

    it("should allow any authenticated user to list plugins", async () => {
      const { organizationId: viewerOrganizationId } = await registerAndLogin(
        app,
        {
          username: "plugin_viewer",
          email: "plugin_viewer@test.com",
          password: "ViewerPass1",
          displayName: "Plugin Viewer",
        },
      );

      // Demote user back to regular role
      const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
      await userRepo.update(
        { username: "plugin_viewer" },
        { roles: ["viewer"] },
      );

      // Re-login to get a token reflecting the demoted role
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ username: "plugin_viewer", password: "ViewerPass1" })
        .expect(200);

      const viewerToken = (loginRes.body as { token: string }).token;

      await request(app.getHttpServer())
        .get("/api/v1/plugins")
        .set("Authorization", `Bearer ${viewerToken}`)
        .set("X-Organization-Id", viewerOrganizationId)
        .expect(200);
    });
  });

  // The controller does not expose a GET /api/plugins/:name endpoint.
  // Requests to unmatched paths under /api/plugins return 404.
  describe("GET /api/plugins/:name (non-existent route)", () => {
    it("should return 404 for an unknown sub-path", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/plugins/nonexistent")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(404);
    });
  });

  describe("GET /api/plugins/menu-items", () => {
    it("should return an array of menu items", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/plugins/menu-items")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/plugins/routes", () => {
    it("should return an array of route contributions", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/plugins/routes")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Organization-Id", adminOrganizationId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Plugin Registry endpoints", () => {
    const validManifest = {
      id: "e2e-test-plugin",
      name: "E2E Test Plugin",
      version: "1.0.0",
      description: "A plugin for e2e testing",
      entryPoint: "https://cdn.example.com/e2e-test/1.0.0/index.js",
    };

    describe("GET /api/plugins/registry", () => {
      it("should return an empty array when no plugins are published", async () => {
        const res = await request(app.getHttpServer())
          .get("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      });

      it("should reject unauthenticated requests", async () => {
        await request(app.getHttpServer())
          .get("/api/v1/plugins/registry")
          .expect(401);
      });
    });

    describe("POST /api/plugins/registry", () => {
      it("should publish a valid manifest and return the registry entry", async () => {
        const res = await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send(validManifest)
          .expect(201);

        const body = res.body as { pluginId: string; latestVersion: string };
        expect(body.pluginId).toBe("e2e-test-plugin");
        expect(body.latestVersion).toBe("1.0.0");
      });

      it("should return 400 for an invalid manifest (missing entryPoint)", async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { entryPoint: _omitted, ...withoutEntryPoint } = validManifest;
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send(withoutEntryPoint)
          .expect(400);
      });

      it("should reject non-admin users", async () => {
        await registerAndLogin(app, {
          username: "registry_viewer",
          email: "registry_viewer@test.com",
          password: "ViewerPass2",
          displayName: "Registry Viewer",
        });

        const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
        await userRepo.update(
          { username: "registry_viewer" },
          { roles: ["viewer"] },
        );

        const loginRes = await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ username: "registry_viewer", password: "ViewerPass2" })
          .expect(200);

        const nonAdminToken = (loginRes.body as { token: string }).token;

        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${nonAdminToken}`)
          .send(validManifest)
          .expect(403);
      });
    });

    describe("GET /api/plugins/registry/:pluginId", () => {
      it("should return the entry for a published plugin", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({ ...validManifest, id: "e2e-registry-lookup" })
          .expect(201);

        const res = await request(app.getHttpServer())
          .get("/api/v1/plugins/registry/e2e-registry-lookup")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        expect((res.body as { pluginId: string }).pluginId).toBe(
          "e2e-registry-lookup",
        );
      });

      it("should return 404 for an unknown plugin", async () => {
        await request(app.getHttpServer())
          .get("/api/v1/plugins/registry/does-not-exist")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(404);
      });
    });

    describe("GET /api/plugins/registry/:pluginId/versions", () => {
      it("should return the versions array for a published plugin", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({ ...validManifest, id: "e2e-versions-plugin" })
          .expect(201);

        const res = await request(app.getHttpServer())
          .get("/api/v1/plugins/registry/e2e-versions-plugin/versions")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toContain("1.0.0");
      });
    });
  });

  describe("Plugin Instance lifecycle endpoints", () => {
    const instanceManifest = {
      id: "e2e-lifecycle-plugin",
      name: "E2E Lifecycle Plugin",
      version: "1.0.0",
      description: "Plugin for lifecycle e2e testing",
      entryPoint: "https://cdn.example.com/lifecycle/1.0.0/index.js",
    };

    describe("GET /api/plugins/instances", () => {
      it("should return an empty array when no instances are installed", async () => {
        const res = await request(app.getHttpServer())
          .get("/api/v1/plugins/instances")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe("POST /api/plugins/:pluginId/install", () => {
      it("should install a registry plugin and return an active instance", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send(instanceManifest)
          .expect(201);

        const res = await request(app.getHttpServer())
          .post("/api/v1/plugins/e2e-lifecycle-plugin/install")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({ orgId: adminOrganizationId })
          .expect(201);

        const installBody = res.body as { pluginId: string; status: string };
        expect(installBody.pluginId).toBe("e2e-lifecycle-plugin");
        expect(installBody.status).toBe("active");
      });

      it("should return 404 when the plugin is not in the registry", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/non-existent-plugin/install")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({})
          .expect(404);
      });
    });

    describe("POST /api/plugins/:id/disable and enable", () => {
      it("should disable an active instance and then re-enable it", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({ ...instanceManifest, id: "e2e-toggle-plugin" })
          .expect(201);

        const installRes = await request(app.getHttpServer())
          .post("/api/v1/plugins/e2e-toggle-plugin/install")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({})
          .expect(201);

        const instanceId = (installRes.body as { id: string }).id;

        const disableRes = await request(app.getHttpServer())
          .post(`/api/v1/plugins/${instanceId}/disable`)
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        expect((disableRes.body as { status: string }).status).toBe("disabled");

        const enableRes = await request(app.getHttpServer())
          .post(`/api/v1/plugins/${instanceId}/enable`)
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        expect((enableRes.body as { status: string }).status).toBe("active");
      });
    });

    describe("GET /api/plugins/:id/health", () => {
      it("should return the health status of an installed plugin", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({ ...instanceManifest, id: "e2e-health-plugin" })
          .expect(201);

        const installRes = await request(app.getHttpServer())
          .post("/api/v1/plugins/e2e-health-plugin/install")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({})
          .expect(201);

        const instanceId = (installRes.body as { id: string }).id;

        const healthRes = await request(app.getHttpServer())
          .get(`/api/v1/plugins/${instanceId}/health`)
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(200);

        const healthBody = healthRes.body as { status: string };
        expect(healthBody.status).toBeDefined();
        expect(["healthy", "degraded", "unknown"]).toContain(healthBody.status);
      });

      it("should return 404 for an unknown instance id", async () => {
        await request(app.getHttpServer())
          .get("/api/v1/plugins/00000000-0000-0000-0000-000000000000/health")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(404);
      });
    });

    describe("DELETE /api/plugins/:id", () => {
      it("should uninstall an instance and return 204", async () => {
        await request(app.getHttpServer())
          .post("/api/v1/plugins/registry")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({ ...instanceManifest, id: "e2e-uninstall-plugin" })
          .expect(201);

        const installRes = await request(app.getHttpServer())
          .post("/api/v1/plugins/e2e-uninstall-plugin/install")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .send({})
          .expect(201);

        const instanceId = (installRes.body as { id: string }).id;

        await request(app.getHttpServer())
          .delete(`/api/v1/plugins/${instanceId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .set("X-Organization-Id", adminOrganizationId)
          .expect(204);
      });
    });
  });
});
