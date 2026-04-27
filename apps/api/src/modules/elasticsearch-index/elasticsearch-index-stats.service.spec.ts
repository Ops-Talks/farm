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
});
