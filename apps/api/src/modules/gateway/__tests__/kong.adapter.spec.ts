import { ConfigService } from "@nestjs/config";
import { KongAdapter } from "../adapters/kong.adapter";
import { GatewayType } from "../enums/gateway-type.enum";
import { HealthStatus } from "../enums/health-status.enum";

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

/**
 * Creates a mock Response object for globalThis.fetch.
 */
function mockFetchResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("KongAdapter", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should have type KONG", () => {
    const config = buildConfigService({
      "gateway.kong.url": "http://kong:8001",
      "gateway.kong.apiKey": "",
    });
    const adapter = new KongAdapter(config);
    expect(adapter.type).toBe(GatewayType.KONG);
  });

  describe("getRoutes()", () => {
    it("should return mapped routes from a single page", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const adapter = new KongAdapter(config);

      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
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
      const adapter = new KongAdapter(config);

      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          mockFetchResponse({
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
          }),
        )
        .mockResolvedValueOnce(
          mockFetchResponse({
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
          }),
        );

      globalThis.fetch = fetchMock;

      const routes = await adapter.getRoutes();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(routes).toHaveLength(2);
      expect(routes[1].externalId).toBe("r2");
    });

    it("should return empty array when data is empty", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const adapter = new KongAdapter(config);

      globalThis.fetch = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({ data: [], next: null }));

      const routes = await adapter.getRoutes();

      expect(routes).toHaveLength(0);
    });

    it("should include kong-admin-token header when apiKey is set", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "secret-token",
      });
      const adapter = new KongAdapter(config);

      const fetchMock = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({ data: [], next: null }));
      globalThis.fetch = fetchMock;

      await adapter.getRoutes();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "kong-admin-token": "secret-token",
          }) as Record<string, string>,
        }),
      );
    });

    it("should stop fetching and return partial results on non-ok response", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const adapter = new KongAdapter(config);

      globalThis.fetch = jest
        .fn()
        .mockResolvedValue(mockFetchResponse({}, false));

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
      const adapter = new KongAdapter(config);

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          mockFetchResponse({ data: [{ name: "upstream-1" }] }),
        )
        .mockResolvedValueOnce(
          mockFetchResponse({ data: [{ health: "HEALTHY" }] }),
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
      const adapter = new KongAdapter(config);

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          mockFetchResponse({ data: [{ name: "upstream-1" }] }),
        )
        .mockResolvedValueOnce(
          mockFetchResponse({ data: [{ health: "UNHEALTHY" }] }),
        );

      const health = await adapter.getHealth();

      expect(health[0].status).toBe(HealthStatus.DOWN);
    });

    it("should return empty array when no upstreams exist", async () => {
      const config = buildConfigService({
        "gateway.kong.url": "http://kong:8001",
        "gateway.kong.apiKey": "",
      });
      const adapter = new KongAdapter(config);

      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockFetchResponse({ data: [] }));

      const health = await adapter.getHealth();

      expect(health).toHaveLength(0);
    });
  });
});
