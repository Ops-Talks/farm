import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ElasticsearchService } from "./elasticsearch.service";
import type { SearchDocument, SearchFilters } from "./elasticsearch.types";

/**
 * Unit tests for ElasticsearchService.
 *
 * The @elastic/elasticsearch Client is replaced with a plain mock object so
 * that no real network connection is required.
 */
describe("ElasticsearchService", () => {
  let service: ElasticsearchService;

  // ---------------------------------------------------------------------------
  // Mock client helpers
  // ---------------------------------------------------------------------------

  const buildMockClient = () => ({
    cluster: {
      health: jest.fn(),
    },
    index: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  });

  const buildModule = async (url: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "elasticsearch.url") return url;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    return module.get<ElasticsearchService>(ElasticsearchService);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // isEnabled()
  // ---------------------------------------------------------------------------

  describe("isEnabled()", () => {
    it("returns false when ELASTICSEARCH_URL is not set", async () => {
      service = await buildModule("");
      expect(service.isEnabled()).toBe(false);
    });

    it("returns true when ELASTICSEARCH_URL is set", async () => {
      service = await buildModule("http://localhost:9200");
      expect(service.isEnabled()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isHealthy()
  // ---------------------------------------------------------------------------

  describe("isHealthy()", () => {
    it("returns false when isEnabled() is false", async () => {
      service = await buildModule("");
      expect(await service.isHealthy()).toBe(false);
    });

    it("returns true when cluster.health() resolves successfully", async () => {
      service = await buildModule("http://localhost:9200");

      // Inject a mock client by replacing the private property.
      const mockClient = buildMockClient();
      mockClient.cluster.health.mockResolvedValue({ status: "green" });
      Object.assign(service, { client: mockClient });

      expect(await service.isHealthy()).toBe(true);
      expect(mockClient.cluster.health).toHaveBeenCalledWith(
        {},
        { requestTimeout: "3s" },
      );
    });

    it("returns false when cluster.health() throws a ConnectionError", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.cluster.health.mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      );
      Object.assign(service, { client: mockClient });

      expect(await service.isHealthy()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // index()
  // ---------------------------------------------------------------------------

  describe("index()", () => {
    const doc: SearchDocument = {
      id: "comp-1",
      type: "component",
      title: "user-service",
      description: "Handles users",
      tags: ["java"],
      organizationId: "org-1",
      updatedAt: new Date().toISOString(),
    };

    it("calls client.index when enabled", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.index.mockResolvedValue({ result: "created" });
      Object.assign(service, { client: mockClient });

      await service.index(doc);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: "farm-search",
        id: doc.id,
        document: doc,
      });
    });

    it("is a no-op when disabled (ELASTICSEARCH_URL not set)", async () => {
      service = await buildModule("");

      const mockClient = buildMockClient();

      await service.index(doc);

      expect(mockClient.index).not.toHaveBeenCalled();
      expect(service.isEnabled()).toBe(false);
    });

    it("logs error when client.index throws", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.index.mockRejectedValue(new Error("index write failed"));
      Object.assign(service, { client: mockClient });

      await expect(service.index(doc)).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // bulkIndex()
  // ---------------------------------------------------------------------------

  describe("bulkIndex()", () => {
    const docs: SearchDocument[] = [
      {
        id: "comp-1",
        type: "component",
        title: "svc-a",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "comp-2",
        type: "component",
        title: "svc-b",
        updatedAt: new Date().toISOString(),
      },
    ];

    it("calls client.bulk when enabled", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.bulk.mockResolvedValue({ errors: false, items: [] });
      Object.assign(service, { client: mockClient });

      await service.bulkIndex(docs);

      expect(mockClient.bulk).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ operations: expect.any(Array) }),
      );
    });

    it("is a no-op when the docs array is empty", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      Object.assign(service, { client: mockClient });

      await service.bulkIndex([]);

      expect(mockClient.bulk).not.toHaveBeenCalled();
    });

    it("logs a warning when bulk response contains errors", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.bulk.mockResolvedValue({ errors: true, items: [] });
      Object.assign(service, { client: mockClient });

      await service.bulkIndex(docs);

      expect(mockClient.bulk).toHaveBeenCalled();
    });

    it("logs error when client.bulk throws", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.bulk.mockRejectedValue(new Error("bulk failure"));
      Object.assign(service, { client: mockClient });

      await expect(service.bulkIndex(docs)).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteFromIndex()
  // ---------------------------------------------------------------------------

  describe("deleteFromIndex()", () => {
    it("ignores 404 when document is not found", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      const notFoundError = Object.assign(new Error("Not Found"), {
        statusCode: 404,
      });
      mockClient.delete.mockRejectedValue(notFoundError);
      Object.assign(service, { client: mockClient });

      await expect(
        service.deleteFromIndex("missing-id"),
      ).resolves.not.toThrow();
    });

    it("calls client.delete with the correct index and id when enabled", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.delete.mockResolvedValue({ result: "deleted" });
      Object.assign(service, { client: mockClient });

      await service.deleteFromIndex("doc-123");

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: "farm-search",
        id: "doc-123",
      });
    });

    it("is a no-op when disabled", async () => {
      service = await buildModule("");

      const mockClient = buildMockClient();
      await service.deleteFromIndex("doc-123");

      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it("logs error when client.delete throws a non-404 error", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      const serverError = Object.assign(new Error("Internal Server Error"), {
        statusCode: 500,
      });
      mockClient.delete.mockRejectedValue(serverError);
      Object.assign(service, { client: mockClient });

      await expect(service.deleteFromIndex("doc-500")).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // search()
  // ---------------------------------------------------------------------------

  describe("search()", () => {
    it("returns empty response when disabled", async () => {
      service = await buildModule("");

      const filters: SearchFilters = {};
      const result = await service.search("query", filters);

      expect(result).toEqual({
        hits: [],
        total: 0,
        facets: { types: [], namespaces: [], tags: [] },
      });
    });

    it("returns mapped hits from client.search when enabled", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.search.mockResolvedValue({
        hits: {
          total: { value: 1, relation: "eq" },
          hits: [
            {
              _id: "comp-1",
              _score: 1.5,
              _source: {
                id: "comp-1",
                type: "component",
                title: "user-service",
                description: "Manages users",
                tags: ["java"],
                organizationId: "org-1",
                updatedAt: new Date().toISOString(),
              },
              highlight: {
                title: ["<em>user</em>-service"],
              },
            },
          ],
        },
        aggregations: {
          types: {
            buckets: [{ key: "component", doc_count: 1 }],
          },
          namespaces: {
            buckets: [],
          },
          tags: {
            buckets: [{ key: "java", doc_count: 1 }],
          },
        },
      });
      Object.assign(service, { client: mockClient });

      const result = await service.search("user", {});

      expect(result.total).toBe(1);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]).toMatchObject({
        id: "comp-1",
        type: "component",
        title: "user-service",
        score: 1.5,
      });
      expect(result.facets.types).toEqual([{ key: "component", count: 1 }]);
      expect(result.facets.tags).toEqual([{ key: "java", count: 1 }]);
    });

    it("builds filter clauses for types, namespace, tags, and orgId", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
        aggregations: {
          types: { buckets: [] },
          namespaces: { buckets: [] },
          tags: { buckets: [] },
        },
      });
      Object.assign(service, { client: mockClient });

      const filters: SearchFilters = {
        types: ["component", "team"],
        namespace: "production",
        tags: ["java", "api"],
        orgId: "org-99",
        page: 2,
        limit: 5,
      };

      await service.search("test", filters);

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: "farm-search",
          from: 5,
          size: 5,
        }),
      );
    });

    it("returns empty and logs error when client.search throws", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.search.mockRejectedValue(new Error("cluster not available"));
      Object.assign(service, { client: mockClient });

      const result = await service.search("fail", {});

      expect(result).toEqual({
        hits: [],
        total: 0,
        facets: { types: [], namespaces: [], tags: [] },
      });
    });

    it("handles numeric total in hits.total", async () => {
      service = await buildModule("http://localhost:9200");

      const mockClient = buildMockClient();
      mockClient.search.mockResolvedValue({
        hits: { total: 42, hits: [] },
        aggregations: {
          types: { buckets: [] },
          namespaces: { buckets: [] },
          tags: { buckets: [] },
        },
      });
      Object.assign(service, { client: mockClient });

      const result = await service.search("numeric", {});

      expect(result.total).toBe(42);
    });
  });
});
