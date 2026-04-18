import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SearchIndexService } from "./search-index.service";
import { ElasticsearchService } from "./elasticsearch.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";

/**
 * Unit tests for SearchIndexService.
 */
describe("SearchIndexService", () => {
  let service: SearchIndexService;

  const mockElasticsearchService = {
    index: jest.fn(),
    bulkIndex: jest.fn(),
    isEnabled: jest.fn().mockReturnValue(true),
  };

  const mockComponentRepo = { find: jest.fn() };
  const mockTeamRepo = { find: jest.fn() };
  const mockDocRepo = { find: jest.fn() };
  const mockEnvRepo = { find: jest.fn() };
  const mockPipelineRepo = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: all repos return empty arrays
    mockComponentRepo.find.mockResolvedValue([]);
    mockTeamRepo.find.mockResolvedValue([]);
    mockDocRepo.find.mockResolvedValue([]);
    mockEnvRepo.find.mockResolvedValue([]);
    mockPipelineRepo.find.mockResolvedValue([]);

    mockElasticsearchService.bulkIndex.mockResolvedValue(undefined);
    mockElasticsearchService.index.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: getRepositoryToken(Component),
          useValue: mockComponentRepo,
        },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        {
          provide: getRepositoryToken(Documentation),
          useValue: mockDocRepo,
        },
        {
          provide: getRepositoryToken(Environment),
          useValue: mockEnvRepo,
        },
        {
          provide: getRepositoryToken(Pipeline),
          useValue: mockPipelineRepo,
        },
      ],
    }).compile();

    service = module.get<SearchIndexService>(SearchIndexService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // reindexAll()
  // ---------------------------------------------------------------------------

  describe("reindexAll()", () => {
    it("fetches entities from all repositories and calls bulkIndex()", async () => {
      const now = new Date();

      mockComponentRepo.find.mockResolvedValue([
        { id: "c-1", name: "svc-a", updatedAt: now },
      ]);
      mockTeamRepo.find.mockResolvedValue([
        { id: "t-1", name: "platform", updatedAt: now },
      ]);
      mockDocRepo.find.mockResolvedValue([
        { id: "d-1", title: "Guide", updatedAt: now },
      ]);
      mockEnvRepo.find.mockResolvedValue([
        { id: "e-1", name: "production", updatedAt: now },
      ]);
      mockPipelineRepo.find.mockResolvedValue([
        { id: "p-1", name: "deploy", updatedAt: now },
      ]);

      await service.reindexAll();

      expect(mockComponentRepo.find).toHaveBeenCalledWith({ where: {} });
      expect(mockTeamRepo.find).toHaveBeenCalledWith({ where: {} });
      expect(mockDocRepo.find).toHaveBeenCalledWith({ where: {} });
      expect(mockEnvRepo.find).toHaveBeenCalledWith({ where: {} });
      expect(mockPipelineRepo.find).toHaveBeenCalledWith({ where: {} });

      expect(mockElasticsearchService.bulkIndex).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "c-1", type: "component" }),
          expect.objectContaining({ id: "t-1", type: "team" }),
          expect.objectContaining({ id: "d-1", type: "documentation" }),
          expect.objectContaining({ id: "e-1", type: "environment" }),
          expect.objectContaining({ id: "p-1", type: "pipeline" }),
        ]),
      );
    });

    it("returns { indexed: N } with the correct total count", async () => {
      const now = new Date();

      mockComponentRepo.find.mockResolvedValue([
        { id: "c-1", name: "a", updatedAt: now },
        { id: "c-2", name: "b", updatedAt: now },
      ]);
      mockTeamRepo.find.mockResolvedValue([
        { id: "t-1", name: "team", updatedAt: now },
      ]);

      const result = await service.reindexAll();

      // 2 components + 1 team + 0 docs + 0 envs + 0 pipelines = 3
      expect(result).toEqual({ indexed: 3 });
    });

    it("scopes the find queries by organizationId when orgId is provided", async () => {
      await service.reindexAll("org-42");

      const expected = { where: { organizationId: "org-42" } };
      expect(mockComponentRepo.find).toHaveBeenCalledWith(expected);
      expect(mockTeamRepo.find).toHaveBeenCalledWith(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // indexDocument()
  // ---------------------------------------------------------------------------

  describe("indexDocument()", () => {
    it("maps a Component correctly to a SearchDocument and calls index()", async () => {
      const now = new Date("2024-01-15T10:00:00.000Z");
      const component: Partial<Component> = {
        id: "comp-abc",
        name: "user-service",
        description: "Manages users",
        tags: ["java", "microservice"],
        organizationId: "org-1",
        updatedAt: now,
      };

      await service.indexDocument(component as Component, "component");

      expect(mockElasticsearchService.index).toHaveBeenCalledWith({
        id: "comp-abc",
        type: "component",
        title: "user-service",
        description: "Manages users",
        tags: ["java", "microservice"],
        organizationId: "org-1",
        updatedAt: now.toISOString(),
      });
    });

    it("maps a Documentation entity using the title field", async () => {
      const now = new Date("2024-02-01T00:00:00.000Z");
      const doc: Partial<Documentation> = {
        id: "doc-1",
        title: "Setup Guide",
        organizationId: "org-2",
        updatedAt: now,
      };

      await service.indexDocument(doc as Documentation, "documentation");

      expect(mockElasticsearchService.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "doc-1",
          type: "documentation",
          title: "Setup Guide",
        }),
      );
    });
  });
});
