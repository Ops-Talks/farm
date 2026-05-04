import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Logger } from "@nestjs/common";

import { ScorecardSchedulerService } from "../scorecard-scheduler.service";
import { ScorecardsService } from "../scorecards.service";
import { Component } from "../../catalog/entities/component.entity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponent(
  id: string,
  organizationId: string | null = "org-1",
): Partial<Component> {
  return { id, organizationId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScorecardSchedulerService", () => {
  let service: ScorecardSchedulerService;
  let loggerErrorSpy: jest.SpyInstance;
  let mockComponentRepo: { find: jest.Mock };
  let mockScorecardsService: { evaluateAndSave: jest.Mock };

  beforeEach(async () => {
    // Create fresh mocks per test to avoid cross-test contamination from
    // unconsumed mockResolvedValueOnce queue entries.
    mockComponentRepo = { find: jest.fn() };
    mockScorecardsService = { evaluateAndSave: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScorecardSchedulerService,
        {
          provide: ScorecardsService,
          useValue: mockScorecardsService,
        },
        {
          provide: getRepositoryToken(Component),
          useValue: mockComponentRepo,
        },
      ],
    }).compile();

    service = module.get<ScorecardSchedulerService>(ScorecardSchedulerService);

    // Spy on the Logger prototype to capture error calls
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Empty catalog ──────────────────────────────────────────────────────────

  it("does nothing when there are no components", async () => {
    mockComponentRepo.find.mockResolvedValueOnce([]);

    await service.recomputeAll();

    expect(mockComponentRepo.find).toHaveBeenCalledTimes(1);
    expect(mockScorecardsService.evaluateAndSave).not.toHaveBeenCalled();
  });

  it("calls componentRepo.find with cursor-based pagination (where:{}, order:{ id: ASC }) on first batch", async () => {
    mockComponentRepo.find.mockResolvedValueOnce([]);

    await service.recomputeAll();

    expect(mockComponentRepo.find).toHaveBeenCalledWith({
      select: ["id", "organizationId"],
      where: {},
      take: 100,
      order: { id: "ASC" },
    });
  });

  // ── Single batch (fewer than 100 components) ───────────────────────────────

  it("calls evaluateAndSave for each component in a single batch", async () => {
    const components = [
      makeComponent("c-1", "org-1"),
      makeComponent("c-2", "org-2"),
      makeComponent("c-3", null),
    ];
    // Partial batch (3 < 100) — the service breaks without a second find() call
    mockComponentRepo.find.mockResolvedValueOnce(components);
    mockScorecardsService.evaluateAndSave.mockResolvedValue(undefined);

    await service.recomputeAll();

    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledTimes(3);
    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledWith(
      "c-1",
      "org-1",
    );
    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledWith(
      "c-2",
      "org-2",
    );
    // null organizationId is converted to undefined
    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledWith(
      "c-3",
      undefined,
    );
  });

  it("stops after a partial batch without fetching another page", async () => {
    const batch = Array.from({ length: 50 }, (_, i) =>
      makeComponent(`c-${i}`, "org-1"),
    );
    mockComponentRepo.find.mockResolvedValueOnce(batch);
    mockScorecardsService.evaluateAndSave.mockResolvedValue(undefined);

    await service.recomputeAll();

    // Exactly one find call — the partial batch triggers the early break
    expect(mockComponentRepo.find).toHaveBeenCalledTimes(1);
    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledTimes(50);
  });

  // ── Multiple batches ───────────────────────────────────────────────────────

  it("processes multiple full batches with cursor-based pagination", async () => {
    const batch1 = Array.from({ length: 100 }, (_, i) =>
      makeComponent(`c-${i}`, "org-1"),
    );
    const batch2 = Array.from({ length: 30 }, (_, i) =>
      makeComponent(`c-${100 + i}`, "org-1"),
    );
    mockComponentRepo.find
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce(batch2);
    mockScorecardsService.evaluateAndSave.mockResolvedValue(undefined);

    await service.recomputeAll();

    expect(mockComponentRepo.find).toHaveBeenCalledTimes(2);
    // First call: no cursor (empty where clause)
    expect(mockComponentRepo.find).toHaveBeenNthCalledWith(1, {
      select: ["id", "organizationId"],
      where: {},
      take: 100,
      order: { id: "ASC" },
    });
    // Second call: cursor set to last id of first batch
    expect(mockComponentRepo.find).toHaveBeenNthCalledWith(2, {
      select: ["id", "organizationId"],
      where: { id: expect.anything() },
      take: 100,
      order: { id: "ASC" },
    });
    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledTimes(130);
  });

  it("fetches a third page and stops on an empty batch when two full batches occur", async () => {
    const batch1 = Array.from({ length: 100 }, (_, i) =>
      makeComponent(`c-${i}`, "org-1"),
    );
    const batch2 = Array.from({ length: 100 }, (_, i) =>
      makeComponent(`c-${100 + i}`, "org-1"),
    );
    mockComponentRepo.find
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce(batch2)
      .mockResolvedValueOnce([]); // third fetch returns empty
    mockScorecardsService.evaluateAndSave.mockResolvedValue(undefined);

    await service.recomputeAll();

    expect(mockComponentRepo.find).toHaveBeenCalledTimes(3);
    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledTimes(200);
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("does not abort the run when evaluateAndSave throws for one component", async () => {
    const components = [
      makeComponent("c-ok-1", "org-1"),
      makeComponent("c-fail", "org-1"),
      makeComponent("c-ok-2", "org-1"),
    ];
    mockComponentRepo.find.mockResolvedValueOnce(components);
    mockScorecardsService.evaluateAndSave
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("DB failure"))
      .mockResolvedValueOnce(undefined);

    await expect(service.recomputeAll()).resolves.toBeUndefined();

    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledTimes(3);
  });

  it("logs an error when evaluateAndSave fails for a component", async () => {
    const components = [makeComponent("c-fail", "org-1")];
    mockComponentRepo.find.mockResolvedValueOnce(components);
    const error = new Error("evaluation error");
    mockScorecardsService.evaluateAndSave.mockRejectedValueOnce(error);

    await service.recomputeAll();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("c-fail"),
      error.stack,
    );
  });

  it("logs error with string representation when err is not an Error instance", async () => {
    const components = [makeComponent("c-fail", "org-1")];
    mockComponentRepo.find.mockResolvedValueOnce(components);
    mockScorecardsService.evaluateAndSave.mockRejectedValueOnce(
      "unexpected string error",
    );

    await service.recomputeAll();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("c-fail"),
      "unexpected string error",
    );
  });

  it("continues processing remaining components in batch after a per-component failure", async () => {
    const components = Array.from({ length: 5 }, (_, i) =>
      makeComponent(`c-${i}`, "org-1"),
    );
    mockComponentRepo.find.mockResolvedValueOnce(components);
    // Second component fails; rest succeed
    mockScorecardsService.evaluateAndSave
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("oops"))
      .mockResolvedValue(undefined);

    await service.recomputeAll();

    expect(mockScorecardsService.evaluateAndSave).toHaveBeenCalledTimes(5);
  });
});
