import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { CircuitBreakerService } from "./circuit-breaker.service";

// The @InjectMetric("integration_circuit_state") decorator resolves to the
// token "PROM_METRIC_INTEGRATION_CIRCUIT_STATE" at runtime.
const CIRCUIT_STATE_TOKEN = "PROM_METRIC_INTEGRATION_CIRCUIT_STATE";

describe("CircuitBreakerService", () => {
  let service: CircuitBreakerService;
  let mockGauge: { set: jest.Mock };

  beforeEach(async () => {
    mockGauge = { set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: CIRCUIT_STATE_TOKEN,
          useValue: mockGauge,
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  describe("fire()", () => {
    it("executes the provided function and returns its result", async () => {
      const result = await service.fire("test-integration", () =>
        Promise.resolve(42),
      );
      expect(result).toBe(42);
    });

    it("propagates errors thrown by the function", async () => {
      const error = new Error("downstream failure");
      await expect(
        service.fire("test-integration", () => Promise.reject(error)),
      ).rejects.toThrow(error);
    });

    it("reuses the same breaker for repeated calls with the same integration name", async () => {
      await service.fire("reuse-integration", () => Promise.resolve("a"));
      await service.fire("reuse-integration", () => Promise.resolve("b"));
      expect(service.getBreakers().size).toBe(1);
      expect(service.getBreakers().has("reuse-integration")).toBe(true);
    });

    it("creates separate breakers for different integration names", async () => {
      await service.fire("integration-alpha", () => Promise.resolve(undefined));
      await service.fire("integration-beta", () => Promise.resolve(undefined));
      expect(service.getBreakers().has("integration-alpha")).toBe(true);
      expect(service.getBreakers().has("integration-beta")).toBe(true);
      expect(service.getBreakers().size).toBe(2);
    });

    it("throws ServiceUnavailableException when the breaker is forced open", async () => {
      // Force-create the breaker first, then open it.
      await service.fire("forced-open", () => Promise.resolve(undefined));
      service.getBreakers().get("forced-open")!.open();

      await expect(
        service.fire("forced-open", () => Promise.resolve("should not run")),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it("includes integration name and error code in 503 response body", async () => {
      await service.fire("named-integration", () => Promise.resolve(undefined));
      service.getBreakers().get("named-integration")!.open();

      try {
        await service.fire("named-integration", () => Promise.resolve("x"));
        throw new Error("Expected ServiceUnavailableException");
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        const response = (err as ServiceUnavailableException).getResponse() as {
          errorCode: string;
          integration: string;
        };
        expect(response.errorCode).toBe("INTEGRATION_UNAVAILABLE");
        expect(response.integration).toBe("named-integration");
      }
    });
  });

  describe("Prometheus gauge updates", () => {
    it("initializes the gauge to CLOSED state when the breaker is first created", async () => {
      await service.fire("init-test", () => Promise.resolve(undefined));

      expect(mockGauge.set).toHaveBeenCalledWith(
        { integration: "init-test", state: "closed" },
        1,
      );
      expect(mockGauge.set).toHaveBeenCalledWith(
        { integration: "init-test", state: "open" },
        0,
      );
      expect(mockGauge.set).toHaveBeenCalledWith(
        { integration: "init-test", state: "half_open" },
        0,
      );
    });

    it("updates gauge labels when the open event fires", async () => {
      await service.fire("gauge-test", () => Promise.resolve(undefined));
      service.getBreakers().get("gauge-test")!.open();

      expect(mockGauge.set).toHaveBeenCalledWith(
        { integration: "gauge-test", state: "open" },
        1,
      );
      expect(mockGauge.set).toHaveBeenCalledWith(
        { integration: "gauge-test", state: "closed" },
        0,
      );
      expect(mockGauge.set).toHaveBeenCalledWith(
        { integration: "gauge-test", state: "half_open" },
        0,
      );
    });
  });
});
