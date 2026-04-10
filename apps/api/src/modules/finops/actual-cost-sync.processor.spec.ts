import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ActualCostSyncProcessor } from "./actual-cost-sync.processor";
import { Component } from "../catalog/entities/component.entity";
import { ActualCost } from "./entities/actual-cost.entity";
import { OpenCostService } from "./open-cost.service";
import { EventsGateway } from "../../common/events/events.gateway";
import { Deployment } from "../environments/entities/deployment.entity";

/**
 * Unit tests for ActualCostSyncProcessor.
 */
describe("ActualCostSyncProcessor", () => {
  let processor: ActualCostSyncProcessor;

  const mockComponentRepo = {
    findOne: jest.fn(),
  };
  const mockActualCostRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const mockDeploymentRepo = {
    find: jest.fn(),
  };
  const mockOpenCostService = {
    getAllocation: jest.fn(),
  };
  const mockEventsGateway = {
    emitCostActualBudgetExceeded: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActualCostSyncProcessor,
        { provide: getRepositoryToken(Component), useValue: mockComponentRepo },
        {
          provide: getRepositoryToken(ActualCost),
          useValue: mockActualCostRepo,
        },
        {
          provide: getRepositoryToken(Deployment),
          useValue: mockDeploymentRepo,
        },
        { provide: OpenCostService, useValue: mockOpenCostService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    processor = module.get<ActualCostSyncProcessor>(ActualCostSyncProcessor);
  });

  it("processes active deployments and saves ActualCost records", async () => {
    mockDeploymentRepo.find.mockResolvedValue([
      { componentId: "comp-1", status: "succeeded" },
    ]);
    mockComponentRepo.findOne.mockResolvedValue({
      id: "comp-1",
      name: "my-service",
      costBudgetUsd: null,
    });
    mockOpenCostService.getAllocation.mockResolvedValue({
      cpuCost: 1.0,
      memoryCost: 0.5,
      pvCost: 0.0,
      networkCost: 0.1,
      totalCost: 1.6,
      currency: "USD",
    });
    const mockRecord = { componentId: "comp-1", totalCost: 1.6 };
    mockActualCostRepo.create.mockReturnValue(mockRecord);
    mockActualCostRepo.save.mockResolvedValue(mockRecord);

    await processor.process();

    expect(mockActualCostRepo.save).toHaveBeenCalledWith(mockRecord);
    expect(
      mockEventsGateway.emitCostActualBudgetExceeded,
    ).not.toHaveBeenCalled();
  });

  it("emits cost:actual-budget-exceeded when totalCost exceeds budget", async () => {
    mockDeploymentRepo.find.mockResolvedValue([
      { componentId: "comp-2", status: "succeeded" },
    ]);
    mockComponentRepo.findOne.mockResolvedValue({
      id: "comp-2",
      name: "expensive-service",
      costBudgetUsd: 1.0,
    });
    mockOpenCostService.getAllocation.mockResolvedValue({
      cpuCost: 5.0,
      memoryCost: 2.0,
      pvCost: 1.0,
      networkCost: 0.5,
      totalCost: 8.5,
      currency: "USD",
    });
    mockActualCostRepo.create.mockReturnValue({});
    mockActualCostRepo.save.mockResolvedValue({});

    await processor.process();

    expect(mockEventsGateway.emitCostActualBudgetExceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        componentId: "comp-2",
        totalCost: 8.5,
        budgetUsd: 1.0,
      }),
    );
  });

  it("does NOT emit event when totalCost is within budget", async () => {
    mockDeploymentRepo.find.mockResolvedValue([
      { componentId: "comp-3", status: "succeeded" },
    ]);
    mockComponentRepo.findOne.mockResolvedValue({
      id: "comp-3",
      name: "cheap-service",
      costBudgetUsd: 100.0,
    });
    mockOpenCostService.getAllocation.mockResolvedValue({
      cpuCost: 1.0,
      memoryCost: 0.5,
      pvCost: 0.0,
      networkCost: 0.1,
      totalCost: 1.6,
      currency: "USD",
    });
    mockActualCostRepo.create.mockReturnValue({});
    mockActualCostRepo.save.mockResolvedValue({});

    await processor.process();

    expect(
      mockEventsGateway.emitCostActualBudgetExceeded,
    ).not.toHaveBeenCalled();
  });

  it("does NOT emit event when costBudgetUsd is null", async () => {
    mockDeploymentRepo.find.mockResolvedValue([
      { componentId: "comp-4", status: "succeeded" },
    ]);
    mockComponentRepo.findOne.mockResolvedValue({
      id: "comp-4",
      name: "no-budget-service",
      costBudgetUsd: null,
    });
    mockOpenCostService.getAllocation.mockResolvedValue({
      cpuCost: 99.0,
      memoryCost: 0.0,
      pvCost: 0.0,
      networkCost: 0.0,
      totalCost: 99.0,
      currency: "USD",
    });
    mockActualCostRepo.create.mockReturnValue({});
    mockActualCostRepo.save.mockResolvedValue({});

    await processor.process();

    expect(
      mockEventsGateway.emitCostActualBudgetExceeded,
    ).not.toHaveBeenCalled();
  });

  it("handles errors per component gracefully without stopping the loop", async () => {
    mockDeploymentRepo.find.mockResolvedValue([
      { componentId: "comp-fail", status: "succeeded" },
      { componentId: "comp-ok", status: "succeeded" },
    ]);
    mockComponentRepo.findOne
      .mockResolvedValueOnce(null) // first: component not found
      .mockResolvedValueOnce({
        id: "comp-ok",
        name: "ok-service",
        costBudgetUsd: null,
      });
    mockOpenCostService.getAllocation.mockResolvedValue({
      cpuCost: 1.0,
      memoryCost: 0.0,
      pvCost: 0.0,
      networkCost: 0.0,
      totalCost: 1.0,
      currency: "USD",
    });
    mockActualCostRepo.create.mockReturnValue({});
    mockActualCostRepo.save.mockResolvedValue({});

    // Should not throw
    await expect(processor.process()).resolves.toBeUndefined();
    expect(mockActualCostRepo.save).toHaveBeenCalledTimes(1);
  });

  it("skips sync when OpenCost returns null for a component", async () => {
    mockDeploymentRepo.find.mockResolvedValue([
      { componentId: "comp-5", status: "succeeded" },
    ]);
    mockComponentRepo.findOne.mockResolvedValue({
      id: "comp-5",
      name: "offline-service",
      costBudgetUsd: null,
    });
    mockOpenCostService.getAllocation.mockResolvedValue(null);

    await processor.process();

    expect(mockActualCostRepo.save).not.toHaveBeenCalled();
  });
});
