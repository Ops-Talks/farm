import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SloCalculatorService } from "./slo-calculator.service";
import { SloService } from "./slo.service";
import { Slo, SloMetricType, SloWindow } from "./entities/slo.entity";
import { SloBudgetStatus } from "./dto/slo-budget-response.dto";

describe("SloCalculatorService", () => {
  let calculator: SloCalculatorService;
  let sloService: { findOne: jest.Mock };
  let configGet: jest.Mock;

  let originalFetch: typeof globalThis.fetch;

  /**
   * Builds a mock Slo entity with sensible defaults. Individual fields
   * can be overridden via the `overrides` parameter.
   */
  const buildSlo = (overrides: Partial<Slo> = {}): Slo => ({
    id: "slo-uuid-1",
    name: "api-availability",
    description: "API gateway availability SLO",
    targetPercent: 99.95,
    metricType: SloMetricType.AVAILABILITY,
    window: SloWindow.THIRTY_DAYS,
    componentId: "comp-uuid-1",
    organizationId: "org-uuid-1",
    enabled: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  });

  beforeEach(async () => {
    originalFetch = globalThis.fetch;

    sloService = { findOne: jest.fn() };
    configGet = jest.fn().mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SloCalculatorService,
        { provide: SloService, useValue: sloService },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    calculator = module.get<SloCalculatorService>(SloCalculatorService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(calculator).toBeDefined();
  });

  describe("calculateBudget - simulated data (no Prometheus)", () => {
    it("should use simulated data when PROMETHEUS_URL is not configured", async () => {
      const slo = buildSlo();
      sloService.findOne.mockResolvedValue(slo);

      const result = await calculator.calculateBudget("slo-uuid-1");

      expect(sloService.findOne).toHaveBeenCalledWith("slo-uuid-1");
      expect(result.sloId).toBe("slo-uuid-1");
      expect(result.name).toBe("api-availability");
      expect(result.targetPercent).toBe(99.95);
      expect(typeof result.currentPercent).toBe("number");
      expect(typeof result.budgetTotal).toBe("number");
      expect(typeof result.budgetConsumed).toBe("number");
      expect(typeof result.budgetRemaining).toBe("number");
      expect(typeof result.burnRate).toBe("number");
      expect(result.windowStart).toBeDefined();
      expect(result.windowEnd).toBeDefined();
    });

    it("should calculate budget with healthy status (currentPercent well above target)", async () => {
      configGet.mockReturnValue("http://prometheus:9090");

      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      // target = 99.0, totalBudget = 1.0
      // currentPercent = 99.99 -> consumed = 0.01 -> remaining = (1.0-0.01)/1.0*100 = 99 -> HEALTHY
      const slo = buildSlo({ targetPercent: 99.0 });
      sloService.findOne.mockResolvedValue(slo);

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          status: "success",
          data: {
            resultType: "matrix",
            result: [
              {
                metric: {},
                values: [[1704067200, "0.9999"]],
              },
            ],
          },
        }),
      });

      const result = await calc.calculateBudget("slo-uuid-1");

      expect(result.status).toBe(SloBudgetStatus.HEALTHY);
      expect(result.budgetRemaining).toBeGreaterThan(50);
    });

    it("should return warning status when budget is 10-50% remaining", async () => {
      // We need a scenario where consumed budget leaves 10-50% remaining.
      // targetPercent = 99.9 -> totalBudget = 0.1
      // The simulated metric hovers near 99.9, so consumed ~= 100 - 99.9 = 0.1
      // budgetRemaining = ((0.1 - 0.1) / 0.1) * 100 ~ near 0 (could be CRITICAL/EXHAUSTED)
      //
      // Instead, we craft a target where the deterministic simulation lands in the WARNING band.
      // For name "warn-test", the hash-based variance produces a known offset.
      // A target of 99.97 with a simulated value near 99.97 gives a totalBudget of 0.03
      // and consumed ~ 0.03 * (1 - remaining_fraction).
      //
      // The easiest approach: use Prometheus with a controlled response.
      configGet.mockReturnValue("http://prometheus:9090");

      // Re-create the service so the constructor picks up the new URL
      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      // target = 99.0, totalBudget = 1.0
      // If currentPercent = 99.6 -> consumed = 0.4 -> remaining = (1.0-0.4)/1.0*100 = 60 -> HEALTHY
      // If currentPercent = 99.8 -> consumed = 0.2 -> remaining = (1.0-0.2)/1.0*100 = 80 -> HEALTHY
      // If currentPercent = 99.5 -> consumed = 0.5 -> remaining = (1.0-0.5)/1.0*100 = 50 -> WARNING (<=50)
      const slo = buildSlo({ targetPercent: 99.0 });
      sloService.findOne.mockResolvedValue(slo);

      // Prometheus returns availability values of 0.995 (= 99.5%)
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          status: "success",
          data: {
            resultType: "matrix",
            result: [
              {
                metric: {},
                values: [[1704067200, "0.995"]],
              },
            ],
          },
        }),
      });

      const result = await calc.calculateBudget("slo-uuid-1");

      expect(result.status).toBe(SloBudgetStatus.WARNING);
      expect(result.budgetRemaining).toBeGreaterThan(10);
      expect(result.budgetRemaining).toBeLessThanOrEqual(50);
    });

    it("should return critical status when budget is 0-10% remaining", async () => {
      configGet.mockReturnValue("http://prometheus:9090");

      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      // target = 99.0, totalBudget = 1.0
      // currentPercent = 99.05 -> consumed = 0.95 -> remaining = (1.0-0.95)/1.0*100 = 5 -> CRITICAL
      const slo = buildSlo({ targetPercent: 99.0 });
      sloService.findOne.mockResolvedValue(slo);

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          status: "success",
          data: {
            resultType: "matrix",
            result: [
              {
                metric: {},
                values: [[1704067200, "0.9905"]],
              },
            ],
          },
        }),
      });

      const result = await calc.calculateBudget("slo-uuid-1");

      expect(result.status).toBe(SloBudgetStatus.CRITICAL);
      expect(result.budgetRemaining).toBeGreaterThan(0);
      expect(result.budgetRemaining).toBeLessThanOrEqual(10);
    });

    it("should return exhausted status when budget is depleted", async () => {
      configGet.mockReturnValue("http://prometheus:9090");

      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      // target = 99.9, totalBudget = 0.1
      // currentPercent = 99.0 -> consumed = 1.0 -> exceeds totalBudget
      // remaining = max(0, (0.1 - 1.0) / 0.1 * 100) = 0 -> EXHAUSTED
      const slo = buildSlo({ targetPercent: 99.9 });
      sloService.findOne.mockResolvedValue(slo);

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          status: "success",
          data: {
            resultType: "matrix",
            result: [
              {
                metric: {},
                values: [[1704067200, "0.99"]],
              },
            ],
          },
        }),
      });

      const result = await calc.calculateBudget("slo-uuid-1");

      expect(result.status).toBe(SloBudgetStatus.EXHAUSTED);
      expect(result.budgetRemaining).toBe(0);
    });
  });

  describe("calculateBudget - Prometheus error handling", () => {
    it("should handle Prometheus query failure gracefully and fall back to simulated data", async () => {
      configGet.mockReturnValue("http://prometheus:9090");

      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      const slo = buildSlo();
      sloService.findOne.mockResolvedValue(slo);

      // Simulate a network error
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      const result = await calc.calculateBudget("slo-uuid-1");

      // Should not throw; falls back to simulated data
      expect(result.sloId).toBe("slo-uuid-1");
      expect(result.name).toBe("api-availability");
      expect(typeof result.currentPercent).toBe("number");
      expect(Object.values(SloBudgetStatus)).toContain(result.status);
    });

    it("should fall back to simulated data when Prometheus returns a non-OK status", async () => {
      configGet.mockReturnValue("http://prometheus:9090");

      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      const slo = buildSlo();
      sloService.findOne.mockResolvedValue(slo);

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const result = await calc.calculateBudget("slo-uuid-1");

      expect(result.sloId).toBe("slo-uuid-1");
      expect(typeof result.currentPercent).toBe("number");
    });

    it("should fall back to simulated data when Prometheus returns empty results", async () => {
      configGet.mockReturnValue("http://prometheus:9090");

      const module = await Test.createTestingModule({
        providers: [
          SloCalculatorService,
          { provide: SloService, useValue: sloService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const calc = module.get<SloCalculatorService>(SloCalculatorService);

      const slo = buildSlo();
      sloService.findOne.mockResolvedValue(slo);

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          status: "success",
          data: { resultType: "matrix", result: [] },
        }),
      });

      const result = await calc.calculateBudget("slo-uuid-1");

      expect(result.sloId).toBe("slo-uuid-1");
      expect(typeof result.currentPercent).toBe("number");
    });
  });
});
