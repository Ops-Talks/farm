import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SearchService } from "./search.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { ElasticsearchService } from "../elasticsearch/elasticsearch.service";
import { SearchConfig } from "./entities/search-config.entity";
import type { EsSearchResponse } from "../elasticsearch/elasticsearch.types";
import type { AdvancedSearchQueryDto } from "./dto/advanced-search-query.dto";

/**
 * Unit tests for SearchService.
 */
describe("SearchService", () => {
  let service: SearchService;

  const createQb = (results: unknown[]) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  });

  const mockComponentRepo = { createQueryBuilder: jest.fn() };
  const mockTeamRepo = { createQueryBuilder: jest.fn() };
  const mockDocRepo = { createQueryBuilder: jest.fn() };
  const mockEnvRepo = { createQueryBuilder: jest.fn() };
  const mockPipelineRepo = { createQueryBuilder: jest.fn() };
  const mockElasticsearchService = {
    isEnabled: jest.fn(),
    search: jest.fn(),
  };
  const mockSearchConfigRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockComponentRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockTeamRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockDocRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockEnvRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockPipelineRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockElasticsearchService.isEnabled.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Component), useValue: mockComponentRepo },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        {
          provide: getRepositoryToken(Documentation),
          useValue: mockDocRepo,
        },
        { provide: getRepositoryToken(Environment), useValue: mockEnvRepo },
        { provide: getRepositoryToken(Pipeline), useValue: mockPipelineRepo },
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: getRepositoryToken(SearchConfig),
          useValue: mockSearchConfigRepo,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("quickSearch()", () => {
    it("returns empty array for query shorter than 2 characters", async () => {
      expect(await service.quickSearch("")).toEqual([]);
      expect(await service.quickSearch("a")).toEqual([]);
      expect(await service.quickSearch("  ")).toEqual([]);
    });

    it("returns results from all entity types", async () => {
      mockComponentRepo.createQueryBuilder.mockReturnValue(
        createQb([
          { id: "c-1", name: "user-service", description: "A service" },
        ]),
      );
      mockTeamRepo.createQueryBuilder.mockReturnValue(
        createQb([
          { id: "t-1", name: "platform team", description: "Platform" },
        ]),
      );
      mockDocRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "d-1", title: "Setup Guide" }]),
      );
      mockEnvRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "e-1", name: "production" }]),
      );
      mockPipelineRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "p-1", name: "deploy pipeline" }]),
      );

      const results = await service.quickSearch("service");

      expect(results).toHaveLength(5);
      expect(results.find((r) => r.type === "component")).toMatchObject({
        type: "component",
        id: "c-1",
        name: "user-service",
        url: "/catalog/c-1",
      });
      expect(results.find((r) => r.type === "team")).toMatchObject({
        type: "team",
        id: "t-1",
      });
      expect(results.find((r) => r.type === "documentation")).toMatchObject({
        type: "documentation",
        id: "d-1",
        name: "Setup Guide",
      });
      expect(results.find((r) => r.type === "environment")).toMatchObject({
        type: "environment",
        id: "e-1",
      });
      expect(results.find((r) => r.type === "pipeline")).toMatchObject({
        type: "pipeline",
        id: "p-1",
      });
    });

    it("respects the limit parameter", async () => {
      const manyComponents = Array.from({ length: 6 }, (_, i) => ({
        id: `c-${i}`,
        name: `service-${i}`,
        description: null,
      }));
      mockComponentRepo.createQueryBuilder.mockReturnValue(
        createQb(manyComponents),
      );

      const results = await service.quickSearch("service", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("queries all repositories with ILIKE pattern", async () => {
      await service.quickSearch("my-query");

      expect(mockComponentRepo.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(mockTeamRepo.createQueryBuilder).toHaveBeenCalledWith("t");
      expect(mockDocRepo.createQueryBuilder).toHaveBeenCalledWith("d");
      expect(mockEnvRepo.createQueryBuilder).toHaveBeenCalledWith("e");
      expect(mockPipelineRepo.createQueryBuilder).toHaveBeenCalledWith("p");
    });

    it("scopes queries by organizationId when orgId is provided", async () => {
      const qb = createQb([]);
      mockComponentRepo.createQueryBuilder.mockReturnValue(qb);
      mockTeamRepo.createQueryBuilder.mockReturnValue(qb);
      mockDocRepo.createQueryBuilder.mockReturnValue(qb);
      mockEnvRepo.createQueryBuilder.mockReturnValue(qb);
      mockPipelineRepo.createQueryBuilder.mockReturnValue(qb);

      await service.quickSearch("test", 10, "org-123");

      // Each query builder should have andWhere called for org scoping
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it("does not add andWhere when orgId is not provided", async () => {
      const qb = createQb([]);
      mockComponentRepo.createQueryBuilder.mockReturnValue(qb);
      mockTeamRepo.createQueryBuilder.mockReturnValue(qb);
      mockDocRepo.createQueryBuilder.mockReturnValue(qb);
      mockEnvRepo.createQueryBuilder.mockReturnValue(qb);
      mockPipelineRepo.createQueryBuilder.mockReturnValue(qb);

      await service.quickSearch("test", 10);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it("omits description field when it is null", async () => {
      mockComponentRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "c-1", name: "svc", description: null }]),
      );

      const results = await service.quickSearch("svc");
      const comp = results.find((r) => r.type === "component");
      expect(comp?.description).toBeUndefined();
    });

    it("omits description field for team when it is null", async () => {
      // Exercises the right branch of `t.description ?? undefined` (line 88).
      mockTeamRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "t-1", name: "platform", description: null }]),
      );

      const results = await service.quickSearch("platform");
      const team = results.find((r) => r.type === "team");
      expect(team?.description).toBeUndefined();
    });

    it("includes description for team when it is a non-null string", async () => {
      // Exercises the left branch of `t.description ?? undefined`.
      mockTeamRepo.createQueryBuilder.mockReturnValue(
        createQb([
          { id: "t-2", name: "infra", description: "Infrastructure team" },
        ]),
      );

      const results = await service.quickSearch("infra");
      const team = results.find((r) => r.type === "team");
      expect(team?.description).toBe("Infrastructure team");
    });
  });

  // ---------------------------------------------------------------------------
  // advancedSearch() — FARM-S316 + FARM-S317
  // ---------------------------------------------------------------------------

  describe("advancedSearch()", () => {
    const baseDto: AdvancedSearchQueryDto = {
      q: "platform",
      page: 1,
      limit: 10,
    };

    const esResponse: EsSearchResponse = {
      hits: [
        {
          id: "c-1",
          type: "component",
          title: "platform-service",
          description: "Core service",
          tags: ["core"],
          namespace: "default",
          highlights: { name: ["<em>platform</em>-service"] },
          score: 4.2,
        },
      ],
      total: 1,
      facets: {
        types: [{ key: "component", count: 1 }],
        namespaces: [{ key: "default", count: 1 }],
        tags: [{ key: "core", count: 1 }],
      },
    };

    it("returns ES results mapped to AdvancedSearchResult with source='elasticsearch' when ES is enabled", async () => {
      mockElasticsearchService.isEnabled.mockReturnValue(true);
      mockElasticsearchService.search.mockResolvedValue(esResponse);
      mockSearchConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.advancedSearch(baseDto, "org-1");

      expect(result.source).toBe("elasticsearch");
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]).toMatchObject({
        id: "c-1",
        type: "component",
        name: "platform-service",
        url: "/catalog/c-1",
        score: 4.2,
      });
      expect(result.total).toBe(1);
      expect(result.facets.types).toEqual([{ key: "component", count: 1 }]);
      expect(result.facets.tags).toEqual([{ key: "core", count: 1 }]);
    });

    it("falls back to database results with source='database' when ES is disabled", async () => {
      mockElasticsearchService.isEnabled.mockReturnValue(false);
      mockSearchConfigRepo.findOne.mockResolvedValue(null);
      mockComponentRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "c-2", name: "api-gateway", description: "Gateway" }]),
      );

      const result = await service.advancedSearch(baseDto, "org-1");

      expect(result.source).toBe("database");
      expect(result.hits.length).toBeGreaterThanOrEqual(0);
      expect(result.facets).toEqual({ types: [], namespaces: [], tags: [] });
    });

    it("filters DB fallback results by dto.types when provided", async () => {
      mockElasticsearchService.isEnabled.mockReturnValue(false);
      mockSearchConfigRepo.findOne.mockResolvedValue(null);
      mockComponentRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "c-3", name: "search-svc", description: null }]),
      );
      mockTeamRepo.createQueryBuilder.mockReturnValue(
        createQb([{ id: "t-3", name: "search-team", description: null }]),
      );

      const dto: AdvancedSearchQueryDto = {
        ...baseDto,
        types: ["component"],
      };
      const result = await service.advancedSearch(dto, "org-1");

      expect(result.source).toBe("database");
      // Only component type results should be present
      expect(result.hits.every((h) => h.type === "component")).toBe(true);
    });

    it("uses hardcoded defaults when no SearchConfig is found in DB", async () => {
      mockElasticsearchService.isEnabled.mockReturnValue(true);
      mockElasticsearchService.search.mockResolvedValue(esResponse);
      // Both findOne calls return null (no org config, no global config)
      mockSearchConfigRepo.findOne.mockResolvedValue(null);

      await service.advancedSearch(baseDto, "org-1");

      expect(mockElasticsearchService.search).toHaveBeenCalledWith(
        baseDto.q,
        expect.objectContaining({ orgId: "org-1" }),
        expect.objectContaining({
          titleBoost: 3,
          tagsBoost: 2,
          descriptionBoost: 1,
          fuzziness: "AUTO",
        }),
      );
    });

    it("uses org-specific config boost weights when a SearchConfig record exists for the org", async () => {
      mockElasticsearchService.isEnabled.mockReturnValue(true);
      mockElasticsearchService.search.mockResolvedValue(esResponse);

      const orgConfig: Partial<SearchConfig> = {
        id: "cfg-1",
        organizationId: "org-1",
        titleBoost: 5,
        tagsBoost: 4,
        descriptionBoost: 2,
        fuzziness: "1",
      };
      // First findOne (org-specific) returns the config
      mockSearchConfigRepo.findOne.mockResolvedValueOnce(orgConfig);

      await service.advancedSearch(baseDto, "org-1");

      expect(mockElasticsearchService.search).toHaveBeenCalledWith(
        baseDto.q,
        expect.objectContaining({ orgId: "org-1" }),
        expect.objectContaining({
          titleBoost: 5,
          tagsBoost: 4,
          descriptionBoost: 2,
          fuzziness: "1",
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getConfig() and upsertConfig()
  // ---------------------------------------------------------------------------

  describe("getConfig()", () => {
    it("returns org-specific config when it exists", async () => {
      const orgConfig = { id: "cfg-1", organizationId: "org-1" };
      mockSearchConfigRepo.findOne.mockResolvedValueOnce(orgConfig);

      const result = await service.getConfig("org-1");

      expect(result).toBe(orgConfig);
      expect(mockSearchConfigRepo.findOne).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
      });
    });

    it("falls back to global config when no org-specific config exists", async () => {
      const globalConfig = { id: "cfg-global", organizationId: null };
      mockSearchConfigRepo.findOne
        .mockResolvedValueOnce(null) // org-specific lookup
        .mockResolvedValueOnce(globalConfig); // global lookup

      const result = await service.getConfig("org-1");

      expect(result).toBe(globalConfig);
    });

    it("returns null when neither org-specific nor global config exists", async () => {
      mockSearchConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.getConfig("org-1");

      expect(result).toBeNull();
    });
  });

  describe("upsertConfig()", () => {
    it("updates existing config and returns saved entity", async () => {
      const existing = {
        id: "cfg-1",
        organizationId: "org-1",
        titleBoost: 3,
        tagsBoost: 2,
        descriptionBoost: 1,
        fuzziness: "AUTO",
      };
      const saved = { ...existing, titleBoost: 5 };
      mockSearchConfigRepo.findOne.mockResolvedValue(existing);
      mockSearchConfigRepo.save.mockResolvedValue(saved);

      const result = await service.upsertConfig({ titleBoost: 5 }, "org-1");

      expect(result.titleBoost).toBe(5);
      expect(mockSearchConfigRepo.save).toHaveBeenCalled();
    });

    it("creates new config when none exists", async () => {
      mockSearchConfigRepo.findOne.mockResolvedValue(null);
      const created = {
        organizationId: "org-new",
        titleBoost: 3,
        tagsBoost: 2,
        descriptionBoost: 1,
        fuzziness: "AUTO",
      };
      mockSearchConfigRepo.create.mockReturnValue(created);
      mockSearchConfigRepo.save.mockResolvedValue({
        id: "cfg-new",
        ...created,
      });

      const result = await service.upsertConfig({}, "org-new");

      expect(mockSearchConfigRepo.create).toHaveBeenCalled();
      expect(result.id).toBe("cfg-new");
    });
  });
});
