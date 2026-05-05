import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { ScorecardsController } from "../scorecards.controller";
import { ScorecardsService } from "../scorecards.service";
import { ScorecardLevel } from "../entities/scorecard-result.entity";
import {
  RefreshScorecardDto,
  ScorecardOverviewDto,
} from "../dto/scorecard-result.dto";

// ---------------------------------------------------------------------------
// Service mock
// ---------------------------------------------------------------------------

const mockScorecardsService = {
  findAll: jest.fn(),
  getOverview: jest.fn(),
  findByComponent: jest.fn(),
  evaluateAndSave: jest.fn(),
};

// ---------------------------------------------------------------------------
// Stub builders
// ---------------------------------------------------------------------------

const NOW = new Date("2024-01-01T00:00:00.000Z");

/**
 * Returns a minimal raw scorecard object as the service would return it from
 * findAll (i.e. a ScorecardResultWithComponent shape).
 */
function makeServiceListResult(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "result-uuid-1",
    componentId: "comp-uuid-1",
    overallScore: 75,
    level: ScorecardLevel.SILVER,
    categoryScores: null,
    criteria: null,
    evaluatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    componentName: "user-service",
    componentKind: "service",
    componentLifecycle: "production",
    teamId: "team-uuid-1",
    ...overrides,
  };
}

/**
 * Returns a minimal raw scorecard object as the service would return it from
 * findByComponent or evaluateAndSave (i.e. a plain ScorecardResult shape).
 */
function makeServiceSingleResult(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "result-uuid-1",
    componentId: "comp-uuid-1",
    overallScore: 80,
    level: ScorecardLevel.GOLD,
    categoryScores: null,
    criteria: null,
    evaluatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers — build a minimal RequestWithOrg stub
// ---------------------------------------------------------------------------

function makeReq(organizationId?: string): { organizationId?: string } {
  return { organizationId };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ScorecardsController", () => {
  let controller: ScorecardsController;
  let service: typeof mockScorecardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScorecardsController],
      providers: [
        {
          provide: ScorecardsService,
          useValue: mockScorecardsService,
        },
      ],
    }).compile();

    controller = module.get<ScorecardsController>(ScorecardsController);
    service = module.get(ScorecardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe("findAll", () => {
    it("returns a mapped ScorecardResultDto array from the service", async () => {
      service.findAll.mockResolvedValue([makeServiceListResult()]);

      const result = await controller.findAll(makeReq());

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("result-uuid-1");
      expect(result[0].componentId).toBe("comp-uuid-1");
      expect(result[0].overallScore).toBe(75);
      expect(result[0].level).toBe(ScorecardLevel.SILVER);
      expect(result[0].componentName).toBe("user-service");
      expect(result[0].componentKind).toBe("service");
      expect(result[0].componentLifecycle).toBe("production");
      expect(result[0].teamId).toBe("team-uuid-1");
    });

    it("passes organizationId from the request context and other query params to the service", async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(
        makeReq("org-uuid-1"),
        ScorecardLevel.GOLD,
        "service",
        "team-uuid-1",
      );

      expect(service.findAll).toHaveBeenCalledWith({
        organizationId: "org-uuid-1",
        level: ScorecardLevel.GOLD,
        kind: "service",
        teamId: "team-uuid-1",
      });
    });

    it("returns an empty array when the service returns no results", async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(makeReq());

      expect(result).toEqual([]);
    });

    it("coerces overallScore from a string to a number via Number()", async () => {
      // TypeORM decimal columns are returned as strings by some drivers.
      service.findAll.mockResolvedValue([
        makeServiceListResult({ overallScore: "82.50" as unknown as number }),
      ]);

      const result = await controller.findAll(makeReq());

      expect(result[0].overallScore).toBe(82.5);
      expect(typeof result[0].overallScore).toBe("number");
    });

    it("maps teamId as null when the service result carries a null teamId", async () => {
      service.findAll.mockResolvedValue([
        makeServiceListResult({ teamId: null }),
      ]);

      const result = await controller.findAll(makeReq());

      expect(result[0].teamId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getOverview
  // -------------------------------------------------------------------------

  describe("getOverview", () => {
    const overviewData: ScorecardOverviewDto = {
      totalComponents: 5,
      averageScore: 70,
      levelDistribution: {
        none: 1,
        bronze: 2,
        silver: 1,
        gold: 1,
        platinum: 0,
      },
      byTeam: [
        {
          teamId: "team-uuid-1",
          teamName: "Platform Engineering",
          averageScore: 70,
          componentCount: 2,
        },
      ],
    };

    it("returns ScorecardOverviewDto from the service", async () => {
      service.getOverview.mockResolvedValue(overviewData);

      const result = await controller.getOverview(makeReq());

      expect(result.totalComponents).toBe(5);
      expect(result.averageScore).toBe(70);
      expect(result.levelDistribution).toEqual(overviewData.levelDistribution);
      expect(result.byTeam).toEqual(overviewData.byTeam);
    });

    it("passes organizationId from the request context to the service", async () => {
      service.getOverview.mockResolvedValue({
        totalComponents: 0,
        averageScore: 0,
        levelDistribution: {},
        byTeam: [],
      });

      await controller.getOverview(makeReq("org-uuid-1"));

      expect(service.getOverview).toHaveBeenCalledWith("org-uuid-1");
    });
  });

  // -------------------------------------------------------------------------
  // findByComponent
  // -------------------------------------------------------------------------

  describe("findByComponent", () => {
    const componentId = "comp-uuid-1";

    it("returns a ScorecardResultDto when the scorecard exists", async () => {
      service.findByComponent.mockResolvedValue(makeServiceSingleResult());

      const result = await controller.findByComponent(makeReq(), componentId);

      expect(result.id).toBe("result-uuid-1");
      expect(result.componentId).toBe("comp-uuid-1");
      expect(result.overallScore).toBe(80);
      expect(result.level).toBe(ScorecardLevel.GOLD);
      expect(result.createdAt).toEqual(NOW);
      expect(result.updatedAt).toEqual(NOW);
    });

    it("throws NotFoundException when the service returns null", async () => {
      service.findByComponent.mockResolvedValue(null);

      await expect(
        controller.findByComponent(makeReq(), componentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------

  describe("refresh", () => {
    const componentId = "comp-uuid-1";

    it("returns a ScorecardResultDto from evaluateAndSave", async () => {
      const saved = makeServiceSingleResult({
        overallScore: 90,
        level: ScorecardLevel.PLATINUM,
        evaluatedAt: NOW,
      });
      service.evaluateAndSave.mockResolvedValue(saved);

      const dto: RefreshScorecardDto = {};
      const result = await controller.refresh(
        makeReq("org-uuid-1"),
        componentId,
        dto,
      );

      expect(result.id).toBe("result-uuid-1");
      expect(result.overallScore).toBe(90);
      expect(result.level).toBe(ScorecardLevel.PLATINUM);
      expect(result.evaluatedAt).toEqual(NOW);
    });

    it("passes componentId and organizationId from the request context to the service", async () => {
      service.evaluateAndSave.mockResolvedValue(makeServiceSingleResult());

      const dto: RefreshScorecardDto = {};
      await controller.refresh(makeReq("org-uuid-1"), componentId, dto);

      expect(service.evaluateAndSave).toHaveBeenCalledWith(
        componentId,
        "org-uuid-1",
      );
    });

    it("passes undefined organizationId when the request context carries no org", async () => {
      service.evaluateAndSave.mockResolvedValue(makeServiceSingleResult());

      const dto: RefreshScorecardDto = {};
      await controller.refresh(makeReq(), componentId, dto);

      expect(service.evaluateAndSave).toHaveBeenCalledWith(
        componentId,
        undefined,
      );
    });
  });
});
