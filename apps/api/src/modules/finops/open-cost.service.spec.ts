import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { OpenCostService } from "./open-cost.service";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

/**
 * Unit tests for OpenCostService.
 * Uses the capture-and-restore pattern for globalThis.fetch to avoid
 * side-effects between test suites.
 */
describe("OpenCostService", () => {
  let service: OpenCostService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenCostService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === "OPENCOST_URL") return "http://opencost.test:9090";
              return defaultVal ?? "";
            }),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: { fire: jest.fn((_, fn: () => unknown) => fn()) },
        },
      ],
    }).compile();

    service = module.get<OpenCostService>(OpenCostService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -------------------------------------------------------------------------
  describe("getAllocation()", () => {
    it("returns a parsed allocation when OpenCost responds successfully", async () => {
      const mockData = {
        data: {
          "my-app": {
            cpuCost: 1.5,
            memoryCost: 0.8,
            pvCost: 0.2,
            networkCost: 0.1,
            totalCost: 2.6,
            currency: "USD",
          },
        },
      };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await service.getAllocation("my-app", "30d");

      expect(result).toEqual({
        cpuCost: 1.5,
        memoryCost: 0.8,
        pvCost: 0.2,
        networkCost: 0.1,
        totalCost: 2.6,
        currency: "USD",
      });
    });

    it("returns null when the HTTP response is not OK", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when data is absent from the response", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when data object is empty", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: {} }),
      });

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when fetch throws a non-Error value", async () => {
      globalThis.fetch = jest.fn().mockRejectedValue("network timeout");

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when fetch throws an Error", async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("URL-encodes labelSelector and window params", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: {} }),
      });

      await service.getAllocation("my app/special", "7d&extra=1");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("filterLabels=app:my%20app%2Fspecial"),
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("window=7d%26extra%3D1"),
      );
    });
  });
});
