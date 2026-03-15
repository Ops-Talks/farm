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
});
