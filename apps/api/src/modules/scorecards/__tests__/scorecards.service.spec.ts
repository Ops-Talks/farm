import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";

import {
  ScorecardsService,
  ScorecardResultWithComponent,
} from "../scorecards.service";
import {
  ScorecardResult,
  ScorecardLevel,
} from "../entities/scorecard-result.entity";
import { ScorecardEvaluatorService } from "../scorecard-evaluator.service";
import { Team } from "../../teams/entities/team.entity";

// ---------------------------------------------------------------------------
// Repository and service mocks
// ---------------------------------------------------------------------------

const mockScorecardResultRepo = {
  findOne: jest.fn(),
  upsert: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockTeamRepo = {
  findBy: jest.fn(),
};

const mockEvaluatorService = {
  evaluate: jest.fn(),
};

// ---------------------------------------------------------------------------
// QueryBuilder mock — chain methods return `this`; getMany is set per test.
// ---------------------------------------------------------------------------

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

// ---------------------------------------------------------------------------
// Stub builders
// ---------------------------------------------------------------------------

/**
 * Returns a minimal ScorecardResult stub suitable for use in mock return
 * values. Fields that are typed non-nullable in the entity but can be null
 * at runtime (e.g. categoryScores from a fresh row) are cast accordingly.
 */
function makeScorecardResult(
  overrides: Partial<Record<string, unknown>> = {},
): ScorecardResult {
  return {
    id: "result-uuid-1",
    componentId: "comp-uuid-1",
    overallScore: 75,
    level: ScorecardLevel.SILVER,
    categoryScores: null,
    criteria: null,
    organizationId: "org-uuid-1",
    evaluatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    component: null,
    ...overrides,
  } as unknown as ScorecardResult;
}

/**
 * Returns a minimal ScorecardResultWithComponent stub for use when
 * simulating the enriched rows returned by the findAll QueryBuilder path.
 */
function makeEnrichedResult(
  overrides: Partial<Record<string, unknown>> = {},
): ScorecardResultWithComponent {
  return {
    id: "result-uuid-1",
    componentId: "comp-uuid-1",
    overallScore: 75,
    level: ScorecardLevel.SILVER,
    categoryScores: null,
    criteria: null,
    organizationId: "org-uuid-1",
    evaluatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    component: null,
    componentName: "user-service",
    componentKind: "service",
    componentLifecycle: "production",
    teamId: undefined,
    ...overrides,
  } as unknown as ScorecardResultWithComponent;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ScorecardsService", () => {
  let service: ScorecardsService;

  beforeEach(async () => {
    // Re-apply the createQueryBuilder return value before each test so the
    // QB chain is always available even after jest.clearAllMocks() runs.
    mockScorecardResultRepo.createQueryBuilder.mockReturnValue(mockQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScorecardsService,
        {
          provide: getRepositoryToken(ScorecardResult),
          useValue: mockScorecardResultRepo,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: mockTeamRepo,
        },
        {
          provide: ScorecardEvaluatorService,
          useValue: mockEvaluatorService,
        },
      ],
    }).compile();

    service = module.get<ScorecardsService>(ScorecardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // evaluateAndSave
  // -------------------------------------------------------------------------

  describe("evaluateAndSave", () => {
    const componentId = "comp-uuid-1";
    const organizationId = "org-uuid-1";

    const evaluated = makeScorecardResult({
      overallScore: 80,
      level: ScorecardLevel.GOLD,
    });

    it("calls evaluator, upserts the result, then returns the persisted record", async () => {
      mockEvaluatorService.evaluate.mockResolvedValue(evaluated);
      mockScorecardResultRepo.upsert.mockResolvedValue(undefined);
      const saved = makeScorecardResult({ id: "persisted-id" });
      mockScorecardResultRepo.findOne.mockResolvedValue(saved);

      const result = await service.evaluateAndSave(componentId, organizationId);

      expect(mockEvaluatorService.evaluate).toHaveBeenCalledWith(
        componentId,
        organizationId,
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { component: _c, ...expectedFields } = evaluated;
      expect(mockScorecardResultRepo.upsert).toHaveBeenCalledWith(
        { ...expectedFields, componentId },
        { conflictPaths: ["componentId"], skipUpdateIfNoValuesChanged: false },
      );
      expect(mockScorecardResultRepo.findOne).toHaveBeenCalledWith({
        where: { componentId },
      });
      expect(result).toEqual(saved);
    });

    it("propagates a NotFoundException thrown by the evaluatorService", async () => {
      mockEvaluatorService.evaluate.mockRejectedValue(
        new NotFoundException(`Component ${componentId} not found`),
      );

      await expect(
        service.evaluateAndSave(componentId, organizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // findByComponent
  // -------------------------------------------------------------------------

  describe("findByComponent", () => {
    const componentId = "comp-uuid-1";

    it("returns the scorecard when found (no org scope)", async () => {
      const scorecard = makeScorecardResult({ componentId });
      mockScorecardResultRepo.findOne.mockResolvedValue(scorecard);

      const result = await service.findByComponent(componentId);

      expect(result).toEqual(scorecard);
      expect(mockScorecardResultRepo.findOne).toHaveBeenCalledWith({
        where: { componentId },
      });
    });

    it("includes organizationId in the where clause when supplied", async () => {
      const scorecard = makeScorecardResult({ componentId });
      mockScorecardResultRepo.findOne.mockResolvedValue(scorecard);

      const result = await service.findByComponent(componentId, "org-uuid-1");

      expect(result).toEqual(scorecard);
      expect(mockScorecardResultRepo.findOne).toHaveBeenCalledWith({
        where: { componentId, organizationId: "org-uuid-1" },
      });
    });

    it("returns null when no scorecard is found", async () => {
      mockScorecardResultRepo.findOne.mockResolvedValue(null);

      const result = await service.findByComponent(componentId);

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe("findAll", () => {
    it("returns an empty array when there are no results", async () => {
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result).toEqual([]);
    });

    it("applies organizationId filter when provided", async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ organizationId: "org-1" });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "sr.organizationId = :organizationId",
        { organizationId: "org-1" },
      );
    });

    it("applies level filter when provided", async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ level: ScorecardLevel.GOLD });

      expect(mockQb.andWhere).toHaveBeenCalledWith("sr.level = :level", {
        level: ScorecardLevel.GOLD,
      });
    });

    it("applies kind filter when provided", async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ kind: "service" });

      expect(mockQb.andWhere).toHaveBeenCalledWith("c.kind = :kind", {
        kind: "service",
      });
    });

    it("applies teamId filter when provided", async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll({ teamId: "team-uuid-1" });

      expect(mockQb.andWhere).toHaveBeenCalledWith("c.teamId = :teamId", {
        teamId: "team-uuid-1",
      });
    });

    it("enriches rows with componentName, componentKind, componentLifecycle, and teamId when component is present", async () => {
      const row = makeScorecardResult({
        component: {
          name: "user-service",
          kind: "service",
          lifecycle: "production",
          teamId: "team-uuid-1",
        },
      });
      mockQb.getMany.mockResolvedValue([row]);

      const results = await service.findAll({});

      expect(results).toHaveLength(1);
      expect(results[0].componentName).toBe("user-service");
      expect(results[0].componentKind).toBe("service");
      expect(results[0].componentLifecycle).toBe("production");
      expect(results[0].teamId).toBe("team-uuid-1");
    });

    it("does not set component metadata fields when component is null", async () => {
      const row = makeScorecardResult({ component: null });
      mockQb.getMany.mockResolvedValue([row]);

      const results = await service.findAll({});

      expect(results[0].componentName).toBeUndefined();
      expect(results[0].componentKind).toBeUndefined();
      expect(results[0].componentLifecycle).toBeUndefined();
    });

    it("does not set component metadata fields when component is undefined", async () => {
      const row = makeScorecardResult({ component: undefined });
      mockQb.getMany.mockResolvedValue([row]);

      const results = await service.findAll({});

      expect(results[0].componentName).toBeUndefined();
      expect(results[0].componentKind).toBeUndefined();
      expect(results[0].componentLifecycle).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getOverview
  // -------------------------------------------------------------------------

  describe("getOverview", () => {
    // Restore the findAll spy after each getOverview test so that no spy
    // leaks into other describe blocks.
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("returns totalComponents = 0 and averageScore = 0 when there are no components", async () => {
      jest.spyOn(service, "findAll").mockResolvedValue([]);
      mockTeamRepo.findBy.mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview.totalComponents).toBe(0);
      expect(overview.averageScore).toBe(0);
    });

    it("initialises all ScorecardLevel keys to 0 in levelDistribution when there are no components", async () => {
      jest.spyOn(service, "findAll").mockResolvedValue([]);
      mockTeamRepo.findBy.mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview.levelDistribution).toEqual({
        [ScorecardLevel.NONE]: 0,
        [ScorecardLevel.BRONZE]: 0,
        [ScorecardLevel.SILVER]: 0,
        [ScorecardLevel.GOLD]: 0,
        [ScorecardLevel.PLATINUM]: 0,
      });
      expect(overview.byTeam).toEqual([]);
    });

    it("returns the correct totalComponents count", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 50,
          level: ScorecardLevel.BRONZE,
        }),
        makeEnrichedResult({
          id: "r2",
          overallScore: 80,
          level: ScorecardLevel.GOLD,
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      mockTeamRepo.findBy.mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview.totalComponents).toBe(2);
    });

    it("computes the correct averageScore across multiple results", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 60,
          level: ScorecardLevel.SILVER,
        }),
        makeEnrichedResult({
          id: "r2",
          overallScore: 80,
          level: ScorecardLevel.GOLD,
        }),
        makeEnrichedResult({
          id: "r3",
          overallScore: 100,
          level: ScorecardLevel.PLATINUM,
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      mockTeamRepo.findBy.mockResolvedValue([]);

      const overview = await service.getOverview();

      // (60 + 80 + 100) / 3 = 80
      expect(overview.averageScore).toBeCloseTo(80, 5);
    });

    it("increments the correct level bucket for each result in levelDistribution", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 0,
          level: ScorecardLevel.NONE,
        }),
        makeEnrichedResult({
          id: "r2",
          overallScore: 30,
          level: ScorecardLevel.BRONZE,
        }),
        makeEnrichedResult({
          id: "r3",
          overallScore: 35,
          level: ScorecardLevel.BRONZE,
        }),
        makeEnrichedResult({
          id: "r4",
          overallScore: 60,
          level: ScorecardLevel.SILVER,
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      mockTeamRepo.findBy.mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview.levelDistribution[ScorecardLevel.NONE]).toBe(1);
      expect(overview.levelDistribution[ScorecardLevel.BRONZE]).toBe(2);
      expect(overview.levelDistribution[ScorecardLevel.SILVER]).toBe(1);
      expect(overview.levelDistribution[ScorecardLevel.GOLD]).toBe(0);
      expect(overview.levelDistribution[ScorecardLevel.PLATINUM]).toBe(0);
    });

    it("aggregates byTeam correctly with averageScore and componentCount per team", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 60,
          level: ScorecardLevel.SILVER,
          teamId: "team-1",
        }),
        makeEnrichedResult({
          id: "r2",
          overallScore: 80,
          level: ScorecardLevel.GOLD,
          teamId: "team-1",
        }),
        makeEnrichedResult({
          id: "r3",
          overallScore: 90,
          level: ScorecardLevel.GOLD,
          teamId: "team-2",
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      mockTeamRepo.findBy.mockResolvedValue([
        { id: "team-1", displayName: "Team Alpha" },
        { id: "team-2", displayName: "Team Beta" },
      ]);

      const overview = await service.getOverview();

      const team1 = overview.byTeam.find((t) => t.teamId === "team-1");
      const team2 = overview.byTeam.find((t) => t.teamId === "team-2");

      expect(team1).toBeDefined();
      // (60 + 80) / 2 = 70
      expect(team1?.averageScore).toBeCloseTo(70, 5);
      expect(team1?.componentCount).toBe(2);
      expect(team1?.teamName).toBe("Team Alpha");

      expect(team2).toBeDefined();
      expect(team2?.averageScore).toBeCloseTo(90, 5);
      expect(team2?.componentCount).toBe(1);
      expect(team2?.teamName).toBe("Team Beta");
    });

    it("skips results without teamId when building the byTeam aggregation", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 60,
          level: ScorecardLevel.SILVER,
          teamId: undefined,
        }),
        makeEnrichedResult({
          id: "r2",
          overallScore: 80,
          level: ScorecardLevel.GOLD,
          teamId: "team-1",
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      mockTeamRepo.findBy.mockResolvedValue([
        { id: "team-1", displayName: "Team Alpha" },
      ]);

      const overview = await service.getOverview();

      expect(overview.byTeam).toHaveLength(1);
      expect(overview.byTeam[0].teamId).toBe("team-1");
    });

    it("fetches team display names from teamRepository using the collected teamIds", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 75,
          level: ScorecardLevel.GOLD,
          teamId: "team-1",
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      mockTeamRepo.findBy.mockResolvedValue([
        { id: "team-1", displayName: "Engineering" },
      ]);

      const overview = await service.getOverview();

      expect(mockTeamRepo.findBy).toHaveBeenCalledWith({
        id: expect.anything() as unknown,
      });
      expect(overview.byTeam[0].teamName).toBe("Engineering");
    });

    it("falls back to teamId as teamName when the team is not found in the repository", async () => {
      const results = [
        makeEnrichedResult({
          id: "r1",
          overallScore: 75,
          level: ScorecardLevel.GOLD,
          teamId: "team-unknown",
        }),
      ];
      jest.spyOn(service, "findAll").mockResolvedValue(results);
      // Repository returns an empty list — the team name is unknown.
      mockTeamRepo.findBy.mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview.byTeam[0].teamName).toBe("team-unknown");
    });

    it("passes organizationId to findAll", async () => {
      const findAllSpy = jest.spyOn(service, "findAll").mockResolvedValue([]);
      mockTeamRepo.findBy.mockResolvedValue([]);

      await service.getOverview("org-uuid-1");

      expect(findAllSpy).toHaveBeenCalledWith({ organizationId: "org-uuid-1" });
    });
  });
});
