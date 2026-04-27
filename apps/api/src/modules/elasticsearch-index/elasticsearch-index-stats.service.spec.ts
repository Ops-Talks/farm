import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ElasticsearchIndexStatsService } from "./elasticsearch-index-stats.service";

/**
 * Unit tests for ElasticsearchIndexStatsService (FARM-T402).
 *
 * Uses the capture-and-restore globalThis.fetch pattern.
 */
describe("ElasticsearchIndexStatsService", () => {
  let service: ElasticsearchIndexStatsService;
  let configValues: Record<string, string | undefined>;

  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    configValues = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchIndexStatsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get(ElasticsearchIndexStatsService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  /** Helper to mock a single ok JSON response from globalThis.fetch. */
  const mockFetchOk = (body: unknown) => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
  };

  // FARM-ST412
  it("returns mapped stats for a healthy ES response", async () => {
    mockFetchOk([
      {
        index: "logs-2026.04.27",
        health: "green",
        status: "open",
        "docs.count": "1234",
        "store.size": "4.2mb",
      },
    ]);

    const result = await service.getIndexStats(["logs-*"], "http://es.test");

    expect(result).toEqual({
      reachable: true,
      stats: [
        {
          pattern: "logs-*",
          index: "logs-2026.04.27",
          health: "green",
          status: "open",
          docsCount: 1234,
          storeSize: "4.2mb",
        },
      ],
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const calls = (globalThis.fetch as jest.Mock).mock.calls as unknown[][];
    const calledUrl = calls[0][0] as string;
    expect(calledUrl).toBe(
      "http://es.test/_cat/indices/logs-*?format=json&h=index,health,status,docs.count,store.size",
    );
  });

  // FARM-ST413
  it("returns { reachable: false } and does not throw when fetch rejects", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    const result = await service.getIndexStats(["logs-*"], "http://es.test");

    expect(result).toEqual({ reachable: false });
  });

  it("returns { reachable: false } and never calls fetch when no URL is configured", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;

    const result = await service.getIndexStats(["logs-*"]);

    expect(result).toEqual({ reachable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("merges results across multiple patterns preserving order", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              index: "logs-a-001",
              health: "green",
              status: "open",
              "docs.count": "10",
              "store.size": "1kb",
            },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              index: "logs-b-001",
              health: "yellow",
              status: "open",
              "docs.count": "20",
              "store.size": "2kb",
            },
          ]),
      });
    globalThis.fetch = fetchMock;

    const result = await service.getIndexStats(
      ["logs-a-*", "logs-b-*"],
      "http://es.test",
    );

    expect(result.reachable).toBe(true);
    if (result.reachable) {
      expect(result.stats.map((s) => s.pattern)).toEqual([
        "logs-a-*",
        "logs-b-*",
      ]);
      expect(result.stats[0].index).toBe("logs-a-001");
      expect(result.stats[1].health).toBe("yellow");
    }
  });

  it("synthesizes a missing placeholder when ES returns no entries", async () => {
    mockFetchOk([]);

    const result = await service.getIndexStats(
      ["logs-empty-*"],
      "http://es.test",
    );

    expect(result).toEqual({
      reachable: true,
      stats: [
        {
          pattern: "logs-empty-*",
          index: "logs-empty-*",
          health: "unknown",
          status: "missing",
          docsCount: 0,
          storeSize: "0b",
        },
      ],
    });
  });

  it("normalizes an unknown health color to 'unknown'", async () => {
    mockFetchOk([
      {
        index: "logs-weird-001",
        health: "unknown-color",
        status: "open",
        "docs.count": "5",
        "store.size": "100b",
      },
    ]);

    const result = await service.getIndexStats(
      ["logs-weird-*"],
      "http://es.test",
    );

    expect(result.reachable).toBe(true);
    if (result.reachable) {
      expect(result.stats[0].health).toBe("unknown");
    }
  });

  it("falls back to the configured ELASTICSEARCH_URL when no override is given", async () => {
    configValues.ELASTICSEARCH_URL = "http://configured-es:9200";
    mockFetchOk([]);

    await service.getIndexStats(["logs-*"]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const calls = (globalThis.fetch as jest.Mock).mock.calls as unknown[][];
    const calledUrl = calls[0][0] as string;
    expect(
      calledUrl.startsWith("http://configured-es:9200/_cat/indices/"),
    ).toBe(true);
  });

  it("returns { reachable: false } on a non-2xx HTTP response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const result = await service.getIndexStats(["logs-*"], "http://es.test");
    expect(result).toEqual({ reachable: false });
  });

  it("includes Basic auth header when credentials are configured", async () => {
    configValues.ELASTICSEARCH_URL = "http://es.test";
    configValues.ELASTICSEARCH_USERNAME = "elastic";
    configValues.ELASTICSEARCH_PASSWORD = "changeme";
    mockFetchOk([]);

    await service.getIndexStats(["logs-*"], "http://es.test");

    const calls = (globalThis.fetch as jest.Mock).mock.calls as unknown[][];
    const init = calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    const expected = `Basic ${Buffer.from("elastic:changeme").toString("base64")}`;
    expect(headers.Authorization).toBe(expected);
  });

  // Security: when esUrl override targets a different host than the
  // configured cluster, the global Basic auth header must NOT be sent
  // (would otherwise leak credentials to attacker-controlled hosts).
  it("omits Basic auth when esUrl override targets a host other than the configured cluster", async () => {
    configValues.ELASTICSEARCH_URL = "http://configured-es:9200";
    configValues.ELASTICSEARCH_USERNAME = "elastic";
    configValues.ELASTICSEARCH_PASSWORD = "changeme";
    mockFetchOk([]);

    await service.getIndexStats(["logs-*"], "http://other-host.test");

    const calls = (globalThis.fetch as jest.Mock).mock.calls as unknown[][];
    const init = calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  // Security: SSRF guard rejects private/loopback override hosts before
  // any outbound request is issued.
  it("returns { reachable: false } and never calls fetch when esUrl override points to a private host", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;

    const result = await service.getIndexStats(
      ["logs-*"],
      "http://192.168.0.10:9200",
    );

    expect(result).toEqual({ reachable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Security: SSRF guard rejects non-http(s) schemes.
  it("returns { reachable: false } and never calls fetch when esUrl override uses a non-http(s) scheme", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;

    const result = await service.getIndexStats(
      ["logs-*"],
      "file:///etc/passwd",
    );

    expect(result).toEqual({ reachable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Behavior change: a 404 from ES means the pattern matched no indices on
  // a reachable cluster, not that the cluster is unreachable.
  it("treats HTTP 404 as 'reachable but missing' and synthesizes a placeholder row", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    const result = await service.getIndexStats(
      ["logs-missing-*"],
      "http://es.test",
    );

    expect(result).toEqual({
      reachable: true,
      stats: [
        {
          pattern: "logs-missing-*",
          index: "logs-missing-*",
          health: "unknown",
          status: "missing",
          docsCount: 0,
          storeSize: "0b",
        },
      ],
    });
  });

  // Coverage: when credentials are configured but no ELASTICSEARCH_URL is
  // set, the Authorization header must NOT be attached (no host to verify).
  it("omits Basic auth when credentials are set but ELASTICSEARCH_URL is missing", async () => {
    configValues.ELASTICSEARCH_USERNAME = "elastic";
    configValues.ELASTICSEARCH_PASSWORD = "changeme";
    mockFetchOk([]);

    await service.getIndexStats(["logs-*"], "http://override.test");

    const calls = (globalThis.fetch as jest.Mock).mock.calls as unknown[][];
    const init = calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  // Coverage: a malformed configured cluster URL should silently disable
  // Basic auth instead of throwing during request building.
  it("omits Basic auth when ELASTICSEARCH_URL cannot be parsed as a URL", async () => {
    configValues.ELASTICSEARCH_URL = "not a url";
    configValues.ELASTICSEARCH_USERNAME = "elastic";
    configValues.ELASTICSEARCH_PASSWORD = "changeme";
    mockFetchOk([]);

    await service.getIndexStats(["logs-*"], "http://override.test");

    const calls = (globalThis.fetch as jest.Mock).mock.calls as unknown[][];
    const init = calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  // Coverage: SSRF guard treats unparseable override URLs as unsafe and
  // refuses to issue any outbound request.
  it("returns { reachable: false } and never calls fetch when esUrl override is not a valid URL", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;

    const result = await service.getIndexStats(["logs-*"], "::not a url::");

    expect(result).toEqual({ reachable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Coverage: opt-in escape hatch ELASTICSEARCH_ALLOW_PRIVATE_HOSTS=true
  // permits private/loopback hosts (e.g. local dev clusters).
  it("allows private host override when ELASTICSEARCH_ALLOW_PRIVATE_HOSTS=true", async () => {
    configValues.ELASTICSEARCH_ALLOW_PRIVATE_HOSTS = "true";
    mockFetchOk([]);

    const result = await service.getIndexStats(
      ["logs-*"],
      "http://192.168.0.10:9200",
    );

    expect(result.reachable).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  // Coverage: AbortError from a timed-out request should not throw and
  // should mark the cluster as unreachable.
  it("returns { reachable: false } when the fetch is aborted (timeout)", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    globalThis.fetch = jest.fn().mockRejectedValue(abortErr);

    const result = await service.getIndexStats(["logs-*"], "http://es.test");

    expect(result).toEqual({ reachable: false });
  });
});
