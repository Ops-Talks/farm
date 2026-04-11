import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SearchService } from "./search.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";

/**
 * Unit tests for SearchService.
 */
describe("SearchService", () => {
  let service: SearchService;

  const createQb = (results: unknown[]) => ({
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  });

  const mockComponentRepo = { createQueryBuilder: jest.fn() };
  const mockTeamRepo = { createQueryBuilder: jest.fn() };
  const mockDocRepo = { createQueryBuilder: jest.fn() };
  const mockEnvRepo = { createQueryBuilder: jest.fn() };
  const mockPipelineRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockComponentRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockTeamRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockDocRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockEnvRepo.createQueryBuilder.mockReturnValue(createQb([]));
    mockPipelineRepo.createQueryBuilder.mockReturnValue(createQb([]));

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
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
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

    it("queries all repositories with LIKE pattern", async () => {
      await service.quickSearch("my-query");

      expect(mockComponentRepo.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(mockTeamRepo.createQueryBuilder).toHaveBeenCalledWith("t");
      expect(mockDocRepo.createQueryBuilder).toHaveBeenCalledWith("d");
      expect(mockEnvRepo.createQueryBuilder).toHaveBeenCalledWith("e");
      expect(mockPipelineRepo.createQueryBuilder).toHaveBeenCalledWith("p");
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
});
