import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CostController } from "./cost.controller";
import { OpenCostService } from "./open-cost.service";
import { Component } from "../catalog/entities/component.entity";
import { ActualCost } from "./entities/actual-cost.entity";
import { Team } from "../teams/entities/team.entity";

/**
 * Unit tests for CostController.
 */
describe("CostController", () => {
  let controller: CostController;

  const mockComponentRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockActualCostRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockTeamRepo = {
    findOne: jest.fn(),
  };
  const mockOpenCostService = {
    getAllocation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostController],
      providers: [
        { provide: OpenCostService, useValue: mockOpenCostService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("http://localhost:9090") },
        },
        { provide: getRepositoryToken(Component), useValue: mockComponentRepo },
        {
          provide: getRepositoryToken(ActualCost),
          useValue: mockActualCostRepo,
        },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
      ],
    }).compile();

    controller = module.get<CostController>(CostController);
  });

  // -------------------------------------------------------------------------
  describe("getActualCost()", () => {
    it("throws NotFoundException when component does not exist", async () => {
      mockComponentRepo.findOne.mockResolvedValue(null);

      await expect(controller.getActualCost("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns sevenDay and thirtyDay allocations", async () => {
      mockComponentRepo.findOne.mockResolvedValue({
        id: "comp-1",
        name: "my-service",
      });
      mockOpenCostService.getAllocation
        .mockResolvedValueOnce({ totalCost: 1.0 })
        .mockResolvedValueOnce({ totalCost: 5.0 });

      const result = await controller.getActualCost("comp-1");

      expect(result.componentId).toBe("comp-1");
      expect(result.sevenDay).toEqual({ totalCost: 1.0 });
      expect(result.thirtyDay).toEqual({ totalCost: 5.0 });
    });
  });

  // -------------------------------------------------------------------------
  describe("getCostHistory()", () => {
    it("returns mapped records with numeric totalCost", async () => {
      mockActualCostRepo.find.mockResolvedValue([
        {
          id: "ac-1",
          componentId: "comp-1",
          window: "30d",
          cpuCost: "1.0000",
          memoryCost: "0.5000",
          pvCost: "0.1000",
          networkCost: "0.0500",
          totalCost: "1.6500",
          currency: "USD",
          syncedAt: new Date("2024-01-01"),
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ]);

      const result = await controller.getCostHistory("comp-1");

      expect(result).toHaveLength(1);
      expect(typeof result[0].totalCost).toBe("number");
      expect(result[0].totalCost).toBeCloseTo(1.65);
      expect(typeof result[0].cpuCost).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  describe("getTeamCostSummary()", () => {
    it("throws NotFoundException when team does not exist", async () => {
      mockTeamRepo.findOne.mockResolvedValue(null);

      await expect(controller.getTeamCostSummary("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns zero total when team has no components", async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: "team-1" });
      mockComponentRepo.find.mockResolvedValue([]);

      const result = await controller.getTeamCostSummary("team-1");

      expect(result.teamId).toBe("team-1");
      expect(result.totalCost).toBe(0);
      expect(result.components).toEqual([]);
    });

    it("returns aggregated total when team has components with costs", async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: "team-1" });
      mockComponentRepo.find.mockResolvedValue([
        { id: "comp-1" },
        { id: "comp-2" },
      ]);

      const mockSubQb = {
        subQuery: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
      };
      const mockQb = {
        innerJoin: jest.fn().mockImplementation((subQbFn: unknown) => {
          if (typeof subQbFn === "function")
            (subQbFn as (qb: unknown) => void)(mockSubQb);
          return mockQb;
        }),
        getMany: jest.fn().mockResolvedValue([
          {
            componentId: "comp-1",
            totalCost: "40",
            currency: "USD",
            window: "30d",
          },
          {
            componentId: "comp-2",
            totalCost: "60",
            currency: "USD",
            window: "30d",
          },
        ]),
      };
      mockActualCostRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await controller.getTeamCostSummary("team-1");

      expect(result.teamId).toBe("team-1");
      expect(result.totalCost).toBe(100);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].componentId).toBe("comp-1");
    });
  });

  describe("getPlatformCostSummary()", () => {
    const buildSubQbMock = () => ({
      subQuery: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    });

    const buildAcQb = (results: object[]) => {
      const subQb = buildSubQbMock();
      const qb = {
        innerJoin: jest.fn().mockImplementation((subQbFn: unknown) => {
          if (typeof subQbFn === "function")
            (subQbFn as (qb: unknown) => void)(subQb);
          return qb;
        }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(results),
      };
      return qb;
    };

    it("returns empty array when no actual costs exist", async () => {
      mockActualCostRepo.createQueryBuilder.mockReturnValue(buildAcQb([]));

      const result = await controller.getPlatformCostSummary(10);

      expect(result).toEqual([]);
    });

    it("returns results with budgetUsd from component table", async () => {
      mockActualCostRepo.createQueryBuilder.mockReturnValue(
        buildAcQb([
          {
            componentId: "comp-1",
            totalCost: 50,
            currency: "USD",
            syncedAt: new Date("2024-01-01"),
          },
        ]),
      );

      const mockCompQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: "comp-1", costBudgetUsd: 100 }]),
      };
      mockComponentRepo.createQueryBuilder.mockReturnValue(mockCompQb);

      const result = await controller.getPlatformCostSummary(10);

      expect(result).toHaveLength(1);
      expect(result[0].budgetUsd).toBe(100);
      expect(result[0].totalCost).toBe(50);
    });

    it("returns null budgetUsd when component has no budget set", async () => {
      mockActualCostRepo.createQueryBuilder.mockReturnValue(
        buildAcQb([
          {
            componentId: "comp-1",
            totalCost: 50,
            currency: "USD",
            syncedAt: new Date("2024-01-01"),
          },
        ]),
      );

      const mockCompQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: "comp-1", costBudgetUsd: null }]),
      };
      mockComponentRepo.createQueryBuilder.mockReturnValue(mockCompQb);

      const result = await controller.getPlatformCostSummary(10);

      expect(result[0].budgetUsd).toBeNull();
    });
  });

  describe("getAvailability()", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns available: true when OpenCost health check succeeds", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }) as unknown as typeof fetch;
      const result = await controller.getAvailability();
      expect(result).toEqual({ available: true });
    });

    it("returns available: false with reason when OpenCost returns non-ok status", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as unknown as typeof fetch;
      const result = await controller.getAvailability();
      expect(result.available).toBe(false);
      expect(result.reason).toContain("503");
    });

    it("returns available: false with reason when OpenCost is unreachable", async () => {
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(
          new Error("ECONNREFUSED"),
        ) as unknown as typeof fetch;
      const result = await controller.getAvailability();
      expect(result.available).toBe(false);
      expect(result.reason).toContain("unreachable");
    });
  });
});
