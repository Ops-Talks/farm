import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setTokens,
  clearTokens,
  getAccessToken,
  ApiError,
  auth,
  catalog,
  deployments,
  teams,
  queues,
  docs,
  health,
  observability,
  environments,
  pipelines,
  organizations,
  alertingRules,
  plugins,
  analytics,
  helm,
  kubernetes,
  integrations,
  argocd,
  circleci,
  jenkins,
  travisci,
  cloud,
  tagPolicies,
  kyverno,
  istio,
  keycloakCredentials,
} from "@/lib/api-client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function noContentResponse() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(undefined) });
}

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTokens();
  });

  afterEach(() => {
    clearTokens();
  });

  describe("token storage", () => {
    it("should store and retrieve tokens", () => {
      setTokens("access-123", "refresh-456", "admin");
      expect(getAccessToken()).toBe("access-123");
    });

    it("should clear tokens", () => {
      setTokens("access-123", "refresh-456", "admin");
      clearTokens();
      expect(getAccessToken()).toBeNull();
    });

    it("should persist tokens to sessionStorage", () => {
      setTokens("access-123", "refresh-456", "admin");
      expect(sessionStorage.setItem).toHaveBeenCalledWith("farm_token", "access-123");
      expect(sessionStorage.setItem).toHaveBeenCalledWith("farm_refresh", "refresh-456");
      expect(sessionStorage.setItem).toHaveBeenCalledWith("farm_username", "admin");
    });

    it("should remove tokens from sessionStorage on clear", () => {
      setTokens("t", "r", "u");
      clearTokens();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith("farm_token");
      expect(sessionStorage.removeItem).toHaveBeenCalledWith("farm_refresh");
      expect(sessionStorage.removeItem).toHaveBeenCalledWith("farm_username");
    });
  });

  describe("ApiError", () => {
    it("should format string message", () => {
      const err = new ApiError(400, {
        statusCode: 400, timestamp: "t", path: "/test", message: "Bad request",
      });
      expect(err.message).toBe("Bad request");
      expect(err.status).toBe(400);
      expect(err.name).toBe("ApiError");
    });

    it("should format array message", () => {
      const err = new ApiError(400, {
        statusCode: 400, timestamp: "t", path: "/test",
        message: ["field1 is required", "field2 must be valid"],
      });
      expect(err.message).toBe("field1 is required, field2 must be valid");
    });
  });

  describe("auth", () => {
    it("should call login endpoint", async () => {
      const response = { user: { id: "1", username: "admin" }, token: "t", refreshToken: "r" };
      mockFetch.mockReturnValueOnce(jsonResponse(response));
      const result = await auth.login({ username: "admin", password: "pass" });
      expect(result).toEqual(response);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/login", expect.objectContaining({ method: "POST" }));
    });

    it("should call refresh endpoint", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ token: "new-t", refreshToken: "new-r" }));
      const result = await auth.refresh({ username: "admin", refreshToken: "old-r" });
      expect(result.token).toBe("new-t");
    });

    it("should call getUsers endpoint", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "1" }]));
      const result = await auth.getUsers();
      expect(result).toHaveLength(1);
    });
  });

  describe("request error handling", () => {
    it("should throw ApiError on non-ok response", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(
        { statusCode: 404, timestamp: "t", path: "/test", message: "Not found" }, 404,
      ));
      await expect(auth.getUsers()).rejects.toThrow(ApiError);
    });

    it("should include Authorization header when token is set", async () => {
      setTokens("my-token", "refresh", "user");
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await auth.getUsers();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer my-token" }),
        }),
      );
    });
  });

  describe("X-Organization-Id header injection (FARM-E25)", () => {
    beforeEach(() => {
      setTokens("tok", "ref", "user");
      mockFetch.mockReturnValue(jsonResponse([]));
    });

    afterEach(() => {
      // Clean up the org key so other tests are not affected.
      sessionStorage.removeItem("farm_current_org");
    });

    it("injects X-Organization-Id when an org id is stored in sessionStorage", async () => {
      // OrganizationProvider stores the raw id string — not a JSON object.
      sessionStorage.setItem("farm_current_org", "org-abc-123");
      await auth.getUsers();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-Organization-Id": "org-abc-123" }),
        }),
      );
    });

    it("omits X-Organization-Id when no org is stored in sessionStorage", async () => {
      // Ensure the key is absent (afterEach cleans up, but be explicit).
      sessionStorage.removeItem("farm_current_org");
      await auth.getUsers();
      const [, callOptions] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string> }];
      expect(callOptions.headers).not.toHaveProperty("X-Organization-Id");
    });

    it("forwards the org header on the retry fetch after a successful token refresh", async () => {
      sessionStorage.setItem("farm_current_org", "org-retry-456");
      // First call returns 401 to trigger refresh; second returns 200.
      mockFetch
        .mockReturnValueOnce(jsonResponse(
          { statusCode: 401, timestamp: "t", path: "/v1/auth/users", message: "Unauthorized" },
          401,
        ))
        .mockReturnValueOnce(
          // Simulated token-refresh response
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ token: "new-tok", refreshToken: "new-ref" }),
          }),
        )
        .mockReturnValueOnce(jsonResponse([]));

      setTokens("old-tok", "ref", "user");
      await auth.getUsers();

      // The third fetch call is the retried original request.
      const [, retryOptions] = mockFetch.mock.calls[2] as [string, { headers: Record<string, string> }];
      expect(retryOptions.headers).toHaveProperty("X-Organization-Id", "org-retry-456");
    });
  });

  describe("catalog", () => {
    it("should list components with query params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await catalog.listComponents({ skip: 0, take: 20, kindGroup: "dev" });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/catalog/components?"), expect.any(Object));
    });

    it("should get component by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "abc", name: "svc" }));
      const result = await catalog.getComponent("abc");
      expect(result.id).toBe("abc");
    });

    it("should create component", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "new" }));
      await catalog.createComponent({ name: "new-svc" });
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/catalog/components", expect.objectContaining({ method: "POST" }));
    });

    it("should update component", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "abc" }));
      await catalog.updateComponent("abc", { name: "updated" });
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/catalog/components/abc", expect.objectContaining({ method: "PATCH" }));
    });

    it("should delete component", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await catalog.deleteComponent("abc");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/catalog/components/abc", expect.objectContaining({ method: "DELETE" }));
    });

    it("should register YAML", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "y1" }));
      await catalog.registerYaml("kind: service");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/catalog/register-yaml", expect.objectContaining({ method: "POST" }));
    });

    it("should discover from location", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ message: "ok" }));
      await catalog.discoverFromLocation("https://github.com/test/repo");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/catalog/locations", expect.objectContaining({ method: "POST" }));
    });
  });

  describe("deployments", () => {
    it("should list deployments", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await deployments.list({ skip: 0, take: 20 });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/deployments"), expect.any(Object));
    });

    it("should get deployment matrix", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await deployments.matrix({ kindGroup: "dev" });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/deployments/matrix"), expect.any(Object));
    });

    it("should create deployment", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "d1" }));
      await deployments.create({ version: "1.0.0" });
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/deployments", expect.objectContaining({ method: "POST" }));
    });

    it("should get latest deployments for component", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await deployments.latest("comp-123");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("componentId=comp-123"), expect.any(Object));
    });
  });

  describe("environments", () => {
    it("should list environments", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await environments.list();
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/environments", expect.any(Object));
    });
  });

  describe("teams", () => {
    it("should list teams", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await teams.list();
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams", expect.any(Object));
    });

    it("should get team members", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await teams.getMembers("team1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/team1/members", expect.any(Object));
    });

    it("should add member", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await teams.addMember("team1", "user1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/team1/members/user1", expect.objectContaining({ method: "POST" }));
    });

    it("should remove member", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await teams.removeMember("team1", "user1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/team1/members/user1", expect.objectContaining({ method: "DELETE" }));
    });

    it("should delete team", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await teams.delete("team1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/team1", expect.objectContaining({ method: "DELETE" }));
    });

    it("should get team components", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await teams.getComponents("team1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/team1/components", expect.any(Object));
    });
  });

  describe("queues", () => {
    it("should list queues", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await queues.list();
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/queues", expect.any(Object));
    });

    it("should list jobs with filters", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await queues.listJobs("catalog-discovery", { status: "failed", limit: 10 });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/queues/catalog-discovery/jobs"), expect.any(Object));
    });

    it("should retry job", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await queues.retryJob("notifications", "job-42");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/queues/notifications/jobs/job-42/retry", expect.objectContaining({ method: "POST" }));
    });
  });

  describe("docs", () => {
    it("should list docs", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await docs.list();
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/docs"), expect.any(Object));
    });

    it("should search docs", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await docs.search("api guide", "comp1");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("q=api%20guide"), expect.any(Object));
    });

    it("should get doc tree", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await docs.tree("comp1");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("componentId=comp1"), expect.any(Object));
    });

    it("should get rendered content", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse("<h1>Hello</h1>"));
      await docs.getRendered("doc1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/docs/doc1/rendered", expect.any(Object));
    });

    it("should create doc", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "d1" }));
      await docs.create({ title: "New Doc" });
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/docs", expect.objectContaining({ method: "POST" }));
    });

    it("should delete doc", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await docs.delete("doc1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/docs/doc1", expect.objectContaining({ method: "DELETE" }));
    });
  });

  describe("health", () => {
    it("should check health", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ status: "ok" }));
      const result = await health.check();
      expect(result.status).toBe("ok");
    });
  });

  describe("observability", () => {
    it("should get summary", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ uptime: 1000 }));
      const result = await observability.summary();
      expect(result.uptime).toBe(1000);
    });
  });

  describe("pipelines", () => {
    const mockRun = {
      id: "run-00000001",
      pipelineId: "p1",
      status: "queued",
      triggeredBy: "alice",
      createdAt: "2025-01-16T12:00:00Z",
      updatedAt: "2025-01-16T12:00:00Z",
    };

    it("should list pipelines", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ data: [], total: 0, skip: 0, take: 20 }),
      );
      const result = await pipelines.list();
      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/pipelines"),
        expect.any(Object),
      );
    });

    it("should trigger a pipeline run", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(mockRun));
      const result = await pipelines.trigger("p1");
      expect(result.id).toBe("run-00000001");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/trigger",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should list runs for a pipeline", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([mockRun]));
      const result = await pipelines.listRuns("p1");
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/runs",
        expect.any(Object),
      );
    });

    it("should get a single run", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(mockRun));
      const result = await pipelines.getRun("p1", "run-00000001");
      expect(result.id).toBe("run-00000001");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/runs/run-00000001",
        expect.any(Object),
      );
    });

    it("approveRun calls POST /runs/:runId/approve and returns updated run", async () => {
      const approved = { ...mockRun, status: "running" };
      mockFetch.mockReturnValueOnce(jsonResponse(approved));

      const result = await pipelines.approveRun("p1", "run-00000001");

      expect(result.status).toBe("running");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/runs/run-00000001/approve",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("rejectRun calls POST /runs/:runId/reject and returns updated run", async () => {
      const rejected = { ...mockRun, status: "failed" };
      mockFetch.mockReturnValueOnce(jsonResponse(rejected));

      const result = await pipelines.rejectRun("p1", "run-00000001");

      expect(result.status).toBe("failed");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/runs/run-00000001/reject",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("cancelRun calls POST /runs/:runId/cancel and returns updated run", async () => {
      const cancelled = { ...mockRun, status: "cancelled" };
      mockFetch.mockReturnValueOnce(jsonResponse(cancelled));

      const result = await pipelines.cancelRun("p1", "run-00000001");

      expect(result.status).toBe("cancelled");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/runs/run-00000001/cancel",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("retrigger calls POST /trigger (same endpoint as trigger) and returns a new run", async () => {
      const newRun = { ...mockRun, id: "run-00000002" };
      mockFetch.mockReturnValueOnce(jsonResponse(newRun));

      const result = await pipelines.retrigger("p1");

      expect(result.id).toBe("run-00000002");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1/trigger",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("approveRun throws ApiError on non-ok response", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse(
          { statusCode: 409, timestamp: "t", path: "/test", message: "Not in approval state" },
          409,
        ),
      );
      await expect(pipelines.approveRun("p1", "run-00000001")).rejects.toThrow(ApiError);
    });

    it("cancelRun throws ApiError when run is already in terminal state", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse(
          { statusCode: 409, timestamp: "t", path: "/test", message: "Run already completed" },
          409,
        ),
      );
      await expect(pipelines.cancelRun("p1", "run-00000001")).rejects.toThrow(ApiError);
    });
  });

  // ─── Extended error handling ──────────────────────────────────────────────

  describe("error handling extended", () => {
    it("should throw ApiError(401) when response is 401 and no refresh token is stored", async () => {
      // No tokens set → getRefreshData() returns null → refresh skipped → falls through to !res.ok throw
      mockFetch.mockReturnValueOnce(
        jsonResponse({ statusCode: 401, timestamp: "t", path: "/v1/auth/users", message: "Unauthorized" }, 401),
      );
      const err = await auth.getUsers().catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    });

    it("should throw ApiError and clear tokens when refresh fails (non-ok response)", async () => {
      setTokens("old-tok", "ref", "user");
      mockFetch
        // Original request → 401
        .mockReturnValueOnce(
          jsonResponse({ statusCode: 401, timestamp: "t", path: "/test", message: "Unauthorized" }, 401),
        )
        // Refresh call → non-ok
        .mockReturnValueOnce(Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) } as Response));

      const err = await auth.getUsers().catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      // Tokens must be cleared after failed refresh
      expect(getAccessToken()).toBeNull();
    });

    it("should throw ApiError and clear tokens when refresh call throws a network error", async () => {
      setTokens("old-tok", "ref", "user");
      mockFetch
        .mockReturnValueOnce(
          jsonResponse({ statusCode: 401, timestamp: "t", path: "/test", message: "Unauthorized" }, 401),
        )
        // Refresh call throws
        .mockRejectedValueOnce(new Error("Network error during refresh"));

      const err = await auth.getUsers().catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(getAccessToken()).toBeNull();
    });

    it("should propagate network errors (fetch throws)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network offline"));
      await expect(auth.getUsers()).rejects.toThrow("Network offline");
    });

    it("should throw ApiError on 403 Forbidden", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ statusCode: 403, timestamp: "t", path: "/test", message: "Forbidden" }, 403),
      );
      const err = await auth.getUsers().catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
    });

    it("should throw ApiError on 500 Internal Server Error", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ statusCode: 500, timestamp: "t", path: "/test", message: "Internal Server Error" }, 500),
      );
      const err = await catalog.listComponents().catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(500);
    });

    it("should return undefined for 204 No Content responses", async () => {
      mockFetch.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) } as Response));
      const result = await catalog.deleteComponent("x");
      expect(result).toBeUndefined();
    });
  });

  // ─── toQueryString edge cases ─────────────────────────────────────────────

  describe("toQueryString edge cases", () => {
    it("should produce no query string when listComponents is called with no args", async () => {
      // toQueryString({}) → entries.length === 0 → returns ""
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await catalog.listComponents();
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/catalog/components", expect.any(Object));
    });

    it("should omit undefined and null values from query string", async () => {
      // Passing undefined/null values → they are filtered out
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await catalog.listComponents({ skip: 0, take: undefined as unknown as number, kindGroup: undefined });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("skip=0");
      expect(url).not.toContain("take=");
      expect(url).not.toContain("kindGroup=");
    });

    it("should filter out null values from query string", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await deployments.list({ skip: 0, componentId: null as unknown as string });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("skip=0");
      expect(url).not.toContain("componentId=");
    });
  });

  // ─── Token storage (extra branch) ─────────────────────────────────────────

  describe("token storage extra branches", () => {
    it("should read access token from sessionStorage when in-memory token is null", () => {
      // clearTokens() already called in beforeEach → accessToken is null
      // Now place token in sessionStorage backing store
      sessionStorage.setItem("farm_token", "session-stored-token");
      const token = getAccessToken();
      expect(token).toBe("session-stored-token");
      // cleanup
      sessionStorage.removeItem("farm_token");
    });
  });

  // ─── Auth extended ────────────────────────────────────────────────────────

  describe("auth extended", () => {
    it("keycloakLogin should set window.location.href to the correct Keycloak URL", () => {
      const originalLocation = window.location;

      // Replace window.location with a writable stub so the assignment can be
      // intercepted without triggering a real jsdom navigation side-effect.
      Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
        configurable: true,
      });

      auth.keycloakLogin("org-123");

      expect(window.location.href).toBe("/api/v1/auth/keycloak?orgId=org-123");

      // Restore the original location object to avoid leaking state into other tests.
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it("keycloakSync should POST to the sync endpoint", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ queued: true }));
      const result = await auth.keycloakSync("org-abc");
      expect(result).toEqual({ queued: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/auth/keycloak/sync/"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Environments extended ────────────────────────────────────────────────

  describe("environments extended", () => {
    it("should get a single environment by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "env-1", name: "production" }));
      const result = await environments.get("env-1");
      expect(result.id).toBe("env-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/environments/env-1", expect.any(Object));
    });

    it("should create an environment", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "env-new", name: "staging" }));
      await environments.create({ name: "staging" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/environments",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Deployments extended ─────────────────────────────────────────────────

  describe("deployments extended", () => {
    it("should get a deployment by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "d1", version: "1.2.0" }));
      const result = await deployments.get("d1");
      expect(result.id).toBe("d1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/deployments/d1", expect.any(Object));
    });

    it("should update a deployment", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "d1", version: "1.3.0" }));
      await deployments.update("d1", { version: "1.3.0" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/deployments/d1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should list deployments with optional filters", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await deployments.list({ componentId: "comp-1", environmentId: "env-1", status: "success" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("componentId=comp-1");
      expect(url).toContain("environmentId=env-1");
      expect(url).toContain("status=success");
    });

    it("should get deployment matrix with all filters", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await deployments.matrix({ kindGroup: "dev", lifecycle: "production", owner: "team-a" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("lifecycle=production");
      expect(url).toContain("owner=team-a");
    });
  });

  // ─── Teams extended ───────────────────────────────────────────────────────

  describe("teams extended", () => {
    it("should get a team by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "team-1", name: "Platform" }));
      const result = await teams.get("team-1");
      expect(result.id).toBe("team-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/team-1", expect.any(Object));
    });

    it("should create a team", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "team-new", name: "DevOps" }));
      await teams.create({ name: "DevOps" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/teams",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should update a team", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "team-1", name: "Platform v2" }));
      await teams.update("team-1", { name: "Platform v2" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/teams/team-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  // ─── Queues extended ──────────────────────────────────────────────────────

  describe("queues extended", () => {
    it("should get a specific queue by name", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ name: "catalog-discovery", waiting: 0 }));
      const result = await queues.get("catalog-discovery");
      expect(result.name).toBe("catalog-discovery");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/queues/catalog-discovery"),
        expect.any(Object),
      );
    });

    it("should get a specific job from a queue", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "job-99", status: "completed" }));
      const result = await queues.getJob("notifications", "job-99");
      expect(result.id).toBe("job-99");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/queues/notifications/jobs/job-99"),
        expect.any(Object),
      );
    });

    it("should list jobs with all filter params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await queues.listJobs("q1", { status: "completed", start: 0, limit: 50 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("status=completed");
      expect(url).toContain("start=0");
      expect(url).toContain("limit=50");
    });
  });

  // ─── Docs extended ────────────────────────────────────────────────────────

  describe("docs extended", () => {
    it("should get a doc by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "doc-1", title: "Getting Started" }));
      const result = await docs.get("doc-1");
      expect(result.id).toBe("doc-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/docs/doc-1", expect.any(Object));
    });

    it("should get raw doc content", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse("# Hello World"));
      await docs.getContent("doc-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/docs/doc-1/content", expect.any(Object));
    });

    it("should update a doc", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "doc-1", title: "Updated" }));
      await docs.update("doc-1", { title: "Updated" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/docs/doc-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should search docs without componentId filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await docs.search("kubernetes");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("q=kubernetes");
      expect(url).not.toContain("componentId");
    });

    it("should list docs with pagination and component filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 10 }));
      await docs.list({ skip: 0, take: 10, componentId: "comp-1" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("componentId=comp-1");
    });
  });

  // ─── Organizations ────────────────────────────────────────────────────────

  describe("organizations", () => {
    it("should list organizations (unwraps .data)", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [{ id: "org-1", name: "ACME" }], total: 1, skip: 0, take: 20 }));
      const result = await organizations.list();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("org-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/organizations"),
        expect.any(Object),
      );
    });

    it("should create an organization", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "org-new", name: "NewCo" }));
      await organizations.create({ name: "NewCo", description: "A new org" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/organizations",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should get an organization by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "org-1", name: "ACME" }));
      const result = await organizations.get("org-1");
      expect(result.id).toBe("org-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/organizations/org-1", expect.any(Object));
    });

    it("should update an organization", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "org-1", name: "ACME v2" }));
      await organizations.update("org-1", { name: "ACME v2" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should delete an organization", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await organizations.delete("org-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    describe("members sub-resource", () => {
      it("should list organization members", async () => {
        mockFetch.mockReturnValueOnce(
          jsonResponse({ data: [{ id: "u1", username: "alice" }], total: 1, skip: 0, take: 20 }),
        );
        const result = await organizations.members.list("org-1");
        expect(result.data).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/organizations/org-1/members"),
          expect.any(Object),
        );
      });

      it("should list members with pagination params", async () => {
        mockFetch.mockReturnValueOnce(
          jsonResponse({ data: [], total: 0, skip: 10, take: 10 }),
        );
        await organizations.members.list("org-1", { skip: 10, take: 10 });
        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toContain("skip=10");
        expect(url).toContain("take=10");
      });

      it("should add a member to an organization", async () => {
        mockFetch.mockReturnValueOnce(jsonResponse({ id: "u1", username: "alice", role: "member" }));
        const result = await organizations.members.add("org-1", { username: "alice", role: "member" });
        expect(result.username).toBe("alice");
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/v1/organizations/org-1/members",
          expect.objectContaining({ method: "POST" }),
        );
      });

      it("should update member role in an organization", async () => {
        mockFetch.mockReturnValueOnce(jsonResponse({ id: "u1", username: "alice", role: "admin" }));
        const result = await organizations.members.updateRole("org-1", "u1", { role: "admin" });
        expect(result.role).toBe("admin");
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/v1/organizations/org-1/members/u1/role",
          expect.objectContaining({ method: "PATCH" }),
        );
      });

      it("should remove a member from an organization", async () => {
        mockFetch.mockReturnValueOnce(noContentResponse());
        await organizations.members.remove("org-1", "u1");
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/v1/organizations/org-1/members/u1",
          expect.objectContaining({ method: "DELETE" }),
        );
      });
    });
  });

  // ─── Observability extended ───────────────────────────────────────────────

  describe("observability extended", () => {
    it("should query a range of metrics", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: { resultType: "matrix", result: [] } }));
      await observability.queryRange("up", 1000, 2000, 15);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/observability/metrics/query-range");
      expect(url).toContain("query=up");
    });

    it("should query instant metrics with a time param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: { resultType: "vector", result: [] } }));
      await observability.queryInstant("up", 1000);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/observability/metrics/query");
      expect(url).toContain("time=1000");
    });

    it("should query instant metrics without a time param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: { resultType: "vector", result: [] } }));
      await observability.queryInstant("up");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/observability/metrics/query");
      expect(url).not.toContain("time=");
    });

    it("should get Jaeger traces with filters", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [] }));
      await observability.getTraces({ service: "api", limit: 20, lookback: "1h" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/observability/traces");
      expect(url).toContain("service=api");
    });

    it("should get trace services list", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: ["api", "web", "db"] }));
      const result = await observability.getTraceServices();
      expect(result.data).toContain("api");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/observability/traces/services"),
        expect.any(Object),
      );
    });

    it("should get a single trace by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [{ traceID: "abc123" }] }));
      const result = await observability.getTrace("abc123");
      expect(result.data[0].traceID).toBe("abc123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/observability/traces/abc123"),
        expect.any(Object),
      );
    });

    it("should get Loki logs with filters", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ streams: [] }));
      await observability.getLogs({ query: "{app=~'api'}", start: 1000, end: 2000, limit: 100 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/observability/logs");
    });

    it("should get Loki log label names", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: ["app", "env"] }));
      const result = await observability.getLogLabels();
      expect(result.data).toContain("app");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/observability/logs/labels"),
        expect.any(Object),
      );
    });
  });

  // ─── Pipelines extended ───────────────────────────────────────────────────

  describe("pipelines extended", () => {
    it("should create a pipeline", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "p-new", name: "CI Pipeline" }));
      await pipelines.create({ name: "CI Pipeline", description: "Main CI" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should get a pipeline by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "p1", name: "Deploy" }));
      const result = await pipelines.get("p1");
      expect(result.id).toBe("p1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/pipelines/p1", expect.any(Object));
    });

    it("should update a pipeline", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "p1", name: "Deploy v2" }));
      await pipelines.update("p1", { name: "Deploy v2" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should remove a pipeline", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await pipelines.remove("p1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/pipelines/p1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should list pipelines with organizationId filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ data: [], total: 0, skip: 0, take: 20 }));
      await pipelines.list({ organizationId: "org-1" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("organizationId=org-1");
    });

    describe("runs sub-namespace", () => {
      it("runs.list should return paginated runs", async () => {
        mockFetch.mockReturnValueOnce(
          jsonResponse({ data: [{ id: "r1" }], total: 1, skip: 0, take: 20 }),
        );
        const result = await pipelines.runs.list("p1");
        expect(result.data).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/pipelines/p1/runs"),
          expect.any(Object),
        );
      });

      it("runs.list should pass pagination + status filters", async () => {
        mockFetch.mockReturnValueOnce(
          jsonResponse({ data: [], total: 0, skip: 0, take: 5 }),
        );
        await pipelines.runs.list("p1", { skip: 0, take: 5, status: "running" });
        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toContain("status=running");
        expect(url).toContain("take=5");
      });

      it("runs.get should return a single run", async () => {
        mockFetch.mockReturnValueOnce(jsonResponse({ id: "r1", status: "success" }));
        const result = await pipelines.runs.get("p1", "r1");
        expect(result.id).toBe("r1");
        expect(mockFetch).toHaveBeenCalledWith("/api/v1/pipelines/p1/runs/r1", expect.any(Object));
      });

      it("runs.stats should return aggregate stats", async () => {
        const stats = { total: 42, byStatus: { success: 40, failed: 2 }, successRate: 0.95, avgDurationMs: 12000, lastRunAt: "2025-01-01" };
        mockFetch.mockReturnValueOnce(jsonResponse(stats));
        const result = await pipelines.runs.stats("p1");
        expect(result.total).toBe(42);
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/v1/pipelines/p1/runs/stats",
          expect.any(Object),
        );
      });

      it("runs.compare should return a per-stage diff", async () => {
        const comparison = {
          runA: { id: "r1", status: "success", triggeredBy: "alice", startedAt: null, finishedAt: null, durationMs: null },
          runB: { id: "r2", status: "failed", triggeredBy: "bob", startedAt: null, finishedAt: null, durationMs: null },
          stageDiff: [],
        };
        mockFetch.mockReturnValueOnce(jsonResponse(comparison));
        const result = await pipelines.runs.compare("p1", "r1", "r2");
        expect(result.runA.id).toBe("r1");
        expect(result.runB.id).toBe("r2");
        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toContain("a=r1");
        expect(url).toContain("b=r2");
      });
    });
  });

  // ─── Alerting Rules ───────────────────────────────────────────────────────

  describe("alertingRules", () => {
    it("should list alerting rules (unwraps .data)", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ data: [{ id: "ar-1", name: "High CPU" }], total: 1, skip: 0, take: 20 }),
      );
      const result = await alertingRules.list();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/alerting-rules"),
        expect.any(Object),
      );
    });

    it("should list alerting rules with filters", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ data: [], total: 0, skip: 0, take: 20 }),
      );
      await alertingRules.list({ componentId: "comp-1", severity: "critical", organizationId: "org-1" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("severity=critical");
    });

    it("should create an alerting rule", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "ar-new", name: "Low Memory" }));
      await alertingRules.create({
        name: "Low Memory",
        expression: "mem < 0.1",
        severity: "warning",
        componentId: "comp-1",
      } as Parameters<typeof alertingRules.create>[0]);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/alerting-rules",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should get an alerting rule by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "ar-1", name: "High CPU" }));
      const result = await alertingRules.get("ar-1");
      expect(result.id).toBe("ar-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/alerting-rules/ar-1", expect.any(Object));
    });

    it("should update an alerting rule", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "ar-1", severity: "critical" }));
      await alertingRules.update("ar-1", { severity: "critical" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/alerting-rules/ar-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should remove an alerting rule", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await alertingRules.remove("ar-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/alerting-rules/ar-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  // ─── Plugins ──────────────────────────────────────────────────────────────

  describe("plugins", () => {
    it("should list plugins", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "plugin-1", name: "GitHub" }]));
      const result = await plugins.list();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/plugins", expect.any(Object));
    });

    it("should reload plugins", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ scanned: 5 }));
      const result = await plugins.reload();
      expect(result.scanned).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/plugins/reload",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Analytics ────────────────────────────────────────────────────────────

  describe("analytics", () => {
    it("should get catalog analytics", async () => {
      const data = {
        ownershipCoverage: { total: 100, withOwner: 80, withoutOwner: 20, coveragePercent: 80 },
        lifecycleDistribution: [],
        kindDistribution: [],
        unownedComponents: [],
      };
      mockFetch.mockReturnValueOnce(jsonResponse(data));
      const result = await analytics.getCatalog();
      expect(result.ownershipCoverage.coveragePercent).toBe(80);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/analytics/catalog", expect.any(Object));
    });

    it("should get DORA analytics", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ periodDays: 30, deploymentFrequency: { deploymentsPerDay: 2.5, total: 75, periodDays: 30 } }),
      );
      await analytics.getDora({ days: 30, componentId: "comp-1" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/analytics/dora");
      expect(url).toContain("days=30");
    });

    it("should get DORA analytics with no params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ periodDays: 30 }));
      await analytics.getDora();
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/analytics/dora", expect.any(Object));
    });

    it("should get usage analytics", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ periodDays: 7, totalAuditEvents: 500, topComponents: [], activeUsers: [], actionBreakdown: [] }),
      );
      await analytics.getUsage({ days: 7 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("days=7");
    });

    it("exportReport should trigger a CSV download when response is ok", async () => {
      setTokens("tok", "ref", "user");

      // Mock URL object methods
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      // Mock anchor element for download
      const mockAnchor = { href: "", download: "", click: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValueOnce(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, "appendChild").mockImplementationOnce(() => mockAnchor as unknown as Node);
      vi.spyOn(document.body, "removeChild").mockImplementationOnce(() => mockAnchor as unknown as Node);

      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(["csv,data"])),
        } as unknown as Response),
      );

      await analytics.exportReport("catalog");

      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toBe("farm-catalog-analytics.csv");
      vi.restoreAllMocks();
    });

    it("exportReport should throw when response is not ok", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: false, status: 500 } as Response),
      );
      await expect(analytics.exportReport("dora")).rejects.toThrow("Export failed: 500");
    });

    it("exportReport should include Authorization header when token is present", async () => {
      setTokens("export-token", "ref", "user");

      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      const mockAnchor = { href: "", download: "", click: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValueOnce(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, "appendChild").mockImplementationOnce(() => mockAnchor as unknown as Node);
      vi.spyOn(document.body, "removeChild").mockImplementationOnce(() => mockAnchor as unknown as Node);

      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([])) } as unknown as Response),
      );

      await analytics.exportReport("usage", 7);

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(url).toContain("report=usage");
      expect(url).toContain("days=7");
      expect(options.headers).toMatchObject({ Authorization: "Bearer export-token" });
      vi.restoreAllMocks();
    });

    it("exportReport should send empty headers object when no token is set", async () => {
      // No tokens set
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      const mockAnchor = { href: "", download: "", click: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValueOnce(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, "appendChild").mockImplementationOnce(() => mockAnchor as unknown as Node);
      vi.spyOn(document.body, "removeChild").mockImplementationOnce(() => mockAnchor as unknown as Node);

      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([])) } as unknown as Response),
      );

      await analytics.exportReport("catalog");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(options.headers).not.toHaveProperty("Authorization");
      vi.restoreAllMocks();
    });
  });

  // ─── Helm ─────────────────────────────────────────────────────────────────

  describe("helm", () => {
    it("should list Helm releases", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "nginx", namespace: "default" }]));
      const result = await helm.listReleases();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/helm/releases", expect.any(Object));
    });

    it("should list Helm releases filtered by namespace", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await helm.listReleases("kube-system");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("namespace=kube-system");
    });

    it("should sync Helm releases from the cluster", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ synced: 3, errors: [] }));
      const result = await helm.syncReleases();
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/helm/releases/sync",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toMatchObject({ synced: 3 });
    });
  });

  // ─── Kubernetes ───────────────────────────────────────────────────────────

  describe("kubernetes", () => {
    it("should list CRDs without a group filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "prometheusrules.monitoring.coreos.com" }]));
      const result = await kubernetes.listCRDs();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/kubernetes/crds", expect.any(Object));
    });

    it("should list CRDs filtered by API group", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "prometheusrules.monitoring.coreos.com" }]));
      await kubernetes.listCRDs("monitoring.coreos.com");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/kubernetes/crds/monitoring.coreos.com"),
        expect.any(Object),
      );
    });

    it("should list Argo Rollouts", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "my-rollout", namespace: "default" }]));
      const result = await kubernetes.listRollouts();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/kubernetes/rollouts"),
        expect.any(Object),
      );
    });

    it("should list rollouts with namespace and componentId filters", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await kubernetes.listRollouts({ namespace: "production", componentId: "comp-1" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("namespace=production");
      expect(url).toContain("componentId=comp-1");
    });
  });

  // ─── Integration Credentials ──────────────────────────────────────────────

  describe("integrations.credentials", () => {
    it("should list credentials without type filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "cred-1", type: "github" }]));
      const result = await integrations.credentials.list();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/integrations/credentials",
        expect.any(Object),
      );
    });

    it("should list credentials filtered by type", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "cred-1", type: "github" }]));
      await integrations.credentials.list("github");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("type=github");
    });

    it("should create a credential", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "cred-new", type: "slack" }));
      await integrations.credentials.create({ type: "slack", token: "xoxb-..." });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/integrations/credentials",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should update a credential", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "cred-1", type: "github" }));
      await integrations.credentials.update("cred-1", { token: "new-token" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/integrations/credentials/cred-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should remove a credential", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await integrations.credentials.remove("cred-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/integrations/credentials/cred-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  // ─── ArgoCD ───────────────────────────────────────────────────────────────

  describe("argocd", () => {
    it("should list ArgoCD applications", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "my-app", status: "Synced" }]));
      const result = await argocd.listApplications();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/argocd/applications", expect.any(Object));
    });

    it("should sync an ArgoCD application", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ message: "Sync initiated" }));
      const result = await argocd.syncApplication("my-app");
      expect(result.message).toBe("Sync initiated");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/argocd/applications/my-app/sync"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── CircleCI ─────────────────────────────────────────────────────────────

  describe("circleci", () => {
    it("should list CircleCI pipelines", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "ci-1", vcsUrl: "https://github.com/x/y" }]));
      const result = await circleci.listPipelines();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/circleci/pipelines"),
        expect.any(Object),
      );
    });

    it("should list CircleCI pipelines filtered by vcsUrl", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await circleci.listPipelines("https://github.com/x/y");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("vcsUrl=");
    });

    it("should trigger a CircleCI pipeline", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "pipe-123", number: 42 }));
      const result = await circleci.triggerPipeline("gh/org/repo");
      expect(result.number).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/trigger"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Jenkins ──────────────────────────────────────────────────────────────

  describe("jenkins", () => {
    it("should list Jenkins jobs", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "build-api", url: "http://jenkins/job/build-api" }]));
      const result = await jenkins.listJobs();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/jenkins/jobs", expect.any(Object));
    });

    it("should trigger a Jenkins build", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await jenkins.triggerBuild("build-api");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/jenkins/jobs/build-api/build"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Travis CI ────────────────────────────────────────────────────────────

  describe("travisci", () => {
    it("should list Travis CI builds", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: 101, state: "passed" }]));
      const result = await travisci.listBuilds();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/travisci/builds"),
        expect.any(Object),
      );
    });

    it("should list Travis CI builds filtered by repoSlug", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await travisci.listBuilds("org/repo");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("repoSlug=");
    });

    it("should restart a Travis CI build by id", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ message: "Build restarted" }));
      const result = await travisci.restartBuild(101);
      expect(result.message).toBe("Build restarted");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/travisci/builds/101/restart"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Cloud ────────────────────────────────────────────────────────────────

  describe("cloud", () => {
    it("should get cloud providers for an org", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse([{ provider: "aws", connected: true, name: "AWS Production" }]),
      );
      const result = await cloud.getProviders("org-1");
      expect(result[0].provider).toBe("aws");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/cloud/providers/org-1"),
        expect.any(Object),
      );
    });

    it("should discover cloud resources without provider filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await cloud.discoverResources("org-1");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
      expect(url).not.toContain("provider=");
    });

    it("should discover cloud resources with provider filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await cloud.discoverResources("org-1", "aws");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("provider=aws");
    });

    it("should get cloud cost breakdown", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse([{ provider: "aws", entries: [{ environment: "prod", cost: 1200, currency: "USD" }] }]),
      );
      const result = await cloud.getCost("org-1", 30);
      expect(result[0].provider).toBe("aws");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
      expect(url).toContain("days=30");
    });

    it("should resolve a cloud secret", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ value: "super-secret" }));
      const result = await cloud.resolveSecret("aws:secretsmanager:my-secret", "org-1");
      expect(result.value).toBe("super-secret");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/cloud/secrets/resolve",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ─── Tag Policies ─────────────────────────────────────────────────────────

  describe("tagPolicies", () => {
    it("should list tag policies for an org", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "tp-1", orgId: "org-1" }]));
      const result = await tagPolicies.list("org-1");
      expect(result).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
    });

    it("should create a tag policy", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "tp-new" }));
      await tagPolicies.create({
        orgId: "org-1",
        resourceType: "ecs-service",
        requiredKeys: ["env", "owner"],
        severity: "error",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/tag-policies",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should update a tag policy", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "tp-1", severity: "warning" }));
      await tagPolicies.update("tp-1", { severity: "warning" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/tag-policies/tp-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should remove a tag policy", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await tagPolicies.remove("tp-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/tag-policies/tp-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should list violations with all optional filters", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ data: [{ id: "v-1" }], total: 1, skip: 0, take: 20 }),
      );
      await tagPolicies.listViolations({
        orgId: "org-1",
        provider: "aws",
        resourceType: "ecs-service",
        resolved: false,
        skip: 0,
        take: 20,
      });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
      expect(url).toContain("provider=aws");
      expect(url).toContain("resourceType=ecs-service");
      expect(url).toContain("resolved=false");
    });

    it("should list violations with only required orgId", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ data: [], total: 0, skip: 0, take: 20 }),
      );
      await tagPolicies.listViolations({ orgId: "org-1" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
      expect(url).not.toContain("provider=");
    });

    it("should resolve a violation", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "v-1", resolved: true }));
      const result = await tagPolicies.resolveViolation("v-1");
      expect(result.id).toBe("v-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/tag-policies/violations/v-1/resolve"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should get compliance summary", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ compliant: 80, total: 100 }));
      const result = await tagPolicies.getComplianceSummary("org-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/tag-policies/compliance-summary"),
        expect.any(Object),
      );
      expect(result).toMatchObject({ total: 100 });
    });

    it("should trigger a tag audit", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ queued: true }));
      const result = await tagPolicies.triggerAudit("org-1");
      expect(result.queued).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/tag-policies/audit"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should export a tag policy as Kyverno YAML", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ yaml: "apiVersion: kyverno.io/v1", filename: "policy.yaml" }));
      const result = await tagPolicies.exportKyverno("tp-1");
      expect(result.filename).toBe("policy.yaml");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/tag-policies/tp-1/export/kyverno"),
        expect.any(Object),
      );
    });
  });

  // ─── Kyverno ──────────────────────────────────────────────────────────────

  describe("kyverno", () => {
    it("should list PolicyReport results without namespace filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ policy: "require-labels", result: "fail" }]));
      const result = await kyverno.listPolicyReports();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/kubernetes/policy-reports", expect.any(Object));
    });

    it("should list PolicyReport results filtered by namespace", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await kyverno.listPolicyReports("kube-system");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("namespace=kube-system");
    });

    it("should list ClusterPolicyReport results", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ policy: "cluster-policy", result: "pass" }]));
      const result = await kyverno.listClusterPolicyReports();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/kubernetes/cluster-policy-reports",
        expect.any(Object),
      );
    });
  });

  // ─── Istio Service Mesh ───────────────────────────────────────────────────

  describe("istio", () => {
    it("should get Istio status without kubeconfig", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ istioEnabled: true }));
      const result = await istio.getStatus();
      expect(result.istioEnabled).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/istio/status", expect.any(Object));
    });

    it("should get Istio status with kubeconfig param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ istioEnabled: false }));
      await istio.getStatus({ kubeconfig: "/home/user/.kube/config" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("kubeconfig=");
    });

    it("should list VirtualServices without params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "frontend-vs" }]));
      const result = await istio.listVirtualServices();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/istio/virtual-services", expect.any(Object));
    });

    it("should list VirtualServices with namespace and kubeconfig", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await istio.listVirtualServices({ namespace: "production", kubeconfig: "/path/to/config" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("namespace=production");
      expect(url).toContain("kubeconfig=");
    });

    it("should get a single VirtualService by namespace and name", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ name: "frontend-vs", namespace: "default" }));
      const result = await istio.getVirtualService("default", "frontend-vs");
      expect(result.name).toBe("frontend-vs");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/istio/virtual-services/default/frontend-vs"),
        expect.any(Object),
      );
    });

    it("should get VirtualService with kubeconfig param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ name: "vs1" }));
      await istio.getVirtualService("default", "vs1", { kubeconfig: "/path" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("kubeconfig=");
    });

    it("should patch VirtualService traffic weights", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await istio.patchWeights("default", "frontend-vs", [
        { destination: "v1", weight: 90 },
        { destination: "v2", weight: 10 },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/weights"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should list PeerAuthentications without params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "default", namespace: "istio-system" }]));
      const result = await istio.listPeerAuthentications();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/istio/peer-authentications",
        expect.any(Object),
      );
    });

    it("should list PeerAuthentications with namespace and kubeconfig", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await istio.listPeerAuthentications({ namespace: "production", kubeconfig: "/path" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("namespace=production");
    });

    it("should list AuthorizationPolicies without params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ name: "allow-internal" }]));
      const result = await istio.listAuthorizationPolicies();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/istio/authorization-policies",
        expect.any(Object),
      );
    });

    it("should list AuthorizationPolicies with namespace filter", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await istio.listAuthorizationPolicies({ namespace: "default" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("namespace=default");
    });

    it("should get RPS metrics for a service", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ timestamps: [], values: [] }));
      await istio.getMetricsRps({ service: "api", namespace: "default" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("service=api");
      expect(url).toContain("namespace=default");
    });

    it("should get RPS metrics with range param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ timestamps: [], values: [] }));
      await istio.getMetricsRps({ service: "api", namespace: "default", range: "1h" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("range=1h");
    });

    it("should get error-rate metrics for a service", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ timestamps: [], values: [] }));
      await istio.getMetricsErrorRate({ service: "api", namespace: "default" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/istio/metrics/error-rate");
    });

    it("should get error-rate metrics with range param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ timestamps: [], values: [] }));
      await istio.getMetricsErrorRate({ service: "api", namespace: "default", range: "30m" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("range=30m");
    });

    it("should get latency percentile metrics", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ p50: [], p95: [], p99: [] }));
      await istio.getMetricsLatency({ service: "api", namespace: "default" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/istio/metrics/latency");
    });

    it("should get latency metrics with range param", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ p50: [], p95: [], p99: [] }));
      await istio.getMetricsLatency({ service: "api", namespace: "default", range: "6h" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("range=6h");
    });

    it("should get service topology without params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ source: "api", target: "db" }]));
      const result = await istio.getTopology();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/istio/topology", expect.any(Object));
    });

    it("should get service topology with orgId and kubeconfig", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([]));
      await istio.getTopology({ orgId: "org-1", kubeconfig: "/path" });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
      expect(url).toContain("kubeconfig=");
    });
  });

  // ─── Keycloak Credentials ─────────────────────────────────────────────────

  describe("keycloakCredentials", () => {
    it("should list Keycloak credentials for an org", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: "kc-1", type: "keycloak" }]));
      const result = await keycloakCredentials.list("org-1");
      expect(result).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("orgId=org-1");
      expect(url).toContain("type=keycloak");
    });

    it("should create a Keycloak credential", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: "kc-new", type: "keycloak" }));
      await keycloakCredentials.create({
        orgId: "org-1",
        name: "Primary SSO",
        keycloakUrl: "https://keycloak.example.com",
        realm: "farm",
        clientId: "farm-app",
        clientSecret: "super-secret",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/integrations/credentials",
        expect.objectContaining({ method: "POST" }),
      );
      // Ensure the payload contains the encrypted fields
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as Record<string, unknown>;
      expect(body.type).toBe("keycloak");
      expect(body.name).toBe("Primary SSO");
      expect(body.orgId).toBe("org-1");
    });

    it("should remove a Keycloak credential", async () => {
      mockFetch.mockReturnValueOnce(noContentResponse());
      await keycloakCredentials.remove("kc-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/integrations/credentials/kc-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  // ─── Concurrent 401 refresh sharing ───────────────────────────────────────

  describe("concurrent 401 token refresh (isRefreshing gate)", () => {
    it("two concurrent 401 responses should share a single refresh call", async () => {
      setTokens("old-tok", "ref", "user");

      // Request 1: 401  →  Request 2: 401  →  Refresh: 200  →  Retry 1: 200  →  Retry 2: 200
      mockFetch
        .mockReturnValueOnce(
          jsonResponse({ statusCode: 401, timestamp: "t", path: "/test", message: "Unauthorized" }, 401),
        )
        .mockReturnValueOnce(
          jsonResponse({ statusCode: 401, timestamp: "t", path: "/test", message: "Unauthorized" }, 401),
        )
        .mockReturnValueOnce(
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ token: "new-tok", refreshToken: "new-ref" }),
          } as Response),
        )
        .mockReturnValue(jsonResponse([]));

      const [r1, r2] = await Promise.all([auth.getUsers(), auth.getUsers()]);
      expect(r1).toEqual([]);
      expect(r2).toEqual([]);

      // There should be exactly one refresh call (third fetch call = /auth/refresh)
      const refreshCalls = mockFetch.mock.calls.filter(
        ([url]: [string]) => String(url).includes("/auth/refresh"),
      );
      expect(refreshCalls.length).toBe(1);
    });
  });
});
