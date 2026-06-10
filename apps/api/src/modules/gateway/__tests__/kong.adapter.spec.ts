import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { KongAdapter } from "../adapters/kong.adapter";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";

function mockHttpService(): HttpService {
  return {
    get: jest.fn().mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ),
    post: jest.fn().mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ),
    put: jest.fn().mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ),
    delete: jest.fn().mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ),
    patch: jest.fn().mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ),
  } as unknown as HttpService;
}

/**
 * Builds a minimal ConfigService mock that returns values from a map.
 */
function buildConfigService(
  values: Record<string, string | boolean>,
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key] ?? ""),
  } as unknown as ConfigService;
}

describe("KongAdapter", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should have type KONG", () => {
    const config = buildConfigService({
      "gateway.kong.url": "http://kong:8001",
      "gateway.kong.apiKey": "",
    });
    const adapter = new KongAdapter(mockHttpService(), config);
    expect(adapter.type).toBe(GatewayType.KONG);
  });

  describe("getRoutes()", () => {
    it("should return mapped routes from a single page", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: {
            data: [
              {
                id: "route-1",
                name: "my-route",
                paths: ["/api"],
                methods: ["GET", "POST"],
                tags: ["v1"],
              },
            ],
            next: null,
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        externalId: "route-1",
        name: "my-route",
        paths: ["/api"],
        methods: ["GET", "POST"],
        tags: ["v1"],
        gatewayType: GatewayType.KONG,
      });
    });

    it("should follow pagination via the next field", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(
          of({
            data: {
              data: [
                {
                  id: "r1",
                  name: "route-1",
                  paths: ["/a"],
                  methods: ["GET"],
                  tags: [],
                },
              ],
              next: "http://kong:8001/routes?size=1000&offset=abc",
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        )
        .mockReturnValueOnce(
          of({
            data: {
              data: [
                {
                  id: "r2",
                  name: "route-2",
                  paths: ["/b"],
                  methods: ["POST"],
                  tags: [],
                },
              ],
              next: null,
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        );

      const routes = await adapter.getRoutes();

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(routes).toHaveLength(2);
      expect(routes[1].externalId).toBe("r2");
    });

    it("should return empty array when data is empty", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: { data: [], next: null },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });

    it("should include kong-admin-token header when apiKey is set", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "secret-token",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: { data: [], next: null },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      await adapter.getRoutes();

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "kong-admin-token": "secret-token",
          }) as unknown,
        }) as unknown,
      );
    });

    it("should stop fetching and return partial results on non-ok response", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: {},
          status: 500,
          statusText: "Internal Server Error",
          headers: {},
          config: {},
        }),
      );

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });
  });

  describe("getHealth()", () => {
    it("should return UP status when all targets are healthy", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(
          of({
            data: { data: [{ name: "upstream-1" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        )
        .mockReturnValueOnce(
          of({
            data: { data: [{ health: "HEALTHY" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        );

      const health = await adapter.getHealth();

      expect(health).toHaveLength(1);
      expect(health[0].status).toBe(HealthStatus.UP);
    });

    it("should return DOWN status when any target is UNHEALTHY", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(
          of({
            data: { data: [{ name: "upstream-1" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        )
        .mockReturnValueOnce(
          of({
            data: { data: [{ health: "UNHEALTHY" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        );

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should return DEGRADED status when a target has HEALTHCHECKS_OFF", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(
          of({
            data: { data: [{ name: "upstream-1" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        )
        .mockReturnValueOnce(
          of({
            data: { data: [{ health: "HEALTHCHECKS_OFF" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        );

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.DEGRADED);
    });

    it("should return DOWN when the upstreams endpoint returns non-ok", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: {},
          status: 500,
          statusText: "Internal Server Error",
          headers: {},
          config: {},
        }),
      );

      const health = await adapter.getHealth();

      expect(health).toHaveLength(0);
    });

    it("should return DOWN when the per-upstream health endpoint returns non-ok", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(
          of({
            data: { data: [{ name: "upstream-1" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        )
        .mockReturnValueOnce(
          of({
            data: {},
            status: 500,
            statusText: "Internal Server Error",
            headers: {},
            config: {},
          }),
        );

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should catch errors from per-upstream health fetch and push DOWN", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock)
        .mockReturnValueOnce(
          of({
            data: { data: [{ name: "upstream-1" }] },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {},
          }),
        )
        .mockReturnValueOnce(throwError(() => new Error("Network failure")));

      const health = await adapter.getHealth();

      expect(health).toHaveLength(1);
      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should return empty array when no upstreams exist", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: { data: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const health = await adapter.getHealth();

      expect(health).toHaveLength(0);
    });
  });

  describe("getRoutes() null-coalescing branches", () => {
    it("should default paths, methods, and tags to empty arrays when null", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const httpService = mockHttpService();
      const adapter = new KongAdapter(httpService, config);

      (httpService.get as jest.Mock).mockReturnValueOnce(
        of({
          data: {
            data: [
              {
                id: "route-null",
                name: "null-route",
                paths: null,
                methods: null,
                tags: null,
              },
            ],
            next: null,
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const routes = await adapter.getRoutes();

      expect(routes[0].paths).toEqual([]);
      expect(routes[0].methods).toEqual([]);
      expect(routes[0].tags).toEqual([]);
    });
  });

  describe("constructor null-coalescing branches", () => {
    it("should default baseUrl and apiKey to empty string when config returns undefined", () => {
      const config = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const adapter = new KongAdapter(mockHttpService(), config);
      expect(adapter.type).toBe(GatewayType.KONG);
    });
  });
});
