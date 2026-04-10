import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinOpsService } from "./finops.service";
import { CostEstimate } from "./entities/cost-estimate.entity";

/**
 * Unit tests for FinOpsService.
 */
describe("FinOpsService", () => {
  let service: FinOpsService;
  let repository: jest.Mocked<Repository<CostEstimate>>;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinOpsService,
        {
          provide: getRepositoryToken(CostEstimate),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<FinOpsService>(FinOpsService);
    repository = module.get(getRepositoryToken(CostEstimate));
  });

  // -------------------------------------------------------------------------
  describe("upsertCostEstimate()", () => {
    const componentId = "comp-uuid-1";
    const baseData = {
      estimatedMonthlyCost: 12.5,
      diffMonthlyCost: 2.5,
      currency: "USD",
    };

    it("creates a new estimate when none exists", async () => {
      const newEstimate = { componentId } as CostEstimate;
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newEstimate);
      repository.save.mockResolvedValue({
        ...newEstimate,
        ...baseData,
      } as CostEstimate);

      const result = await service.upsertCostEstimate(componentId, baseData);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { componentId },
      });
      expect(repository.create).toHaveBeenCalledWith({ componentId });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toMatchObject({ componentId });
    });

    it("updates an existing estimate when one already exists", async () => {
      const existing = {
        id: "est-uuid-1",
        componentId,
        estimatedMonthlyCost: 5.0,
      } as CostEstimate;
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue({
        ...existing,
        ...baseData,
      } as CostEstimate);

      await service.upsertCostEstimate(componentId, baseData);

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estimatedMonthlyCost: 12.5 }),
      );
    });

    it("defaults currency to USD when not provided", async () => {
      const newEstimate = { componentId } as CostEstimate;
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newEstimate);
      repository.save.mockImplementation((e: CostEstimate) =>
        Promise.resolve(e),
      );

      await service.upsertCostEstimate(componentId, {
        estimatedMonthlyCost: 10,
        diffMonthlyCost: 1,
      });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "USD" }),
      );
    });

    it("sets measuredAt to now when not provided", async () => {
      const newEstimate = { componentId } as CostEstimate;
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newEstimate);
      repository.save.mockImplementation((e: CostEstimate) =>
        Promise.resolve(e),
      );

      const before = new Date();
      await service.upsertCostEstimate(componentId, {
        estimatedMonthlyCost: 10,
        diffMonthlyCost: 1,
      });
      const after = new Date();

      const saved = repository.save.mock.calls[0][0] as CostEstimate;
      expect(saved.measuredAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(saved.measuredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("stores pipelineRunId and breakdown when provided", async () => {
      const newEstimate = { componentId } as CostEstimate;
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newEstimate);
      repository.save.mockImplementation((e: CostEstimate) =>
        Promise.resolve(e),
      );

      await service.upsertCostEstimate(componentId, {
        estimatedMonthlyCost: 10,
        diffMonthlyCost: 1,
        pipelineRunId: "run-uuid-1",
        breakdown: { projects: [] },
      });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineRunId: "run-uuid-1",
          breakdown: { projects: [] },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("getCostEstimate()", () => {
    it("returns the estimate when found", async () => {
      const estimate = { id: "est-1", componentId: "comp-1" } as CostEstimate;
      repository.findOne.mockResolvedValue(estimate);

      const result = await service.getCostEstimate("comp-1");

      expect(result).toBe(estimate);
    });

    it("returns null when no estimate exists", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getCostEstimate("comp-missing");

      expect(result).toBeNull();
    });
  });
});
