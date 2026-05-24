import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import CircuitBreaker from "opossum";
import { Gauge } from "prom-client";

/**
 * Service providing per-integration circuit breakers backed by opossum.
 *
 * Each unique integration name gets its own CircuitBreaker instance, created
 * lazily on first use and stored for the lifetime of the process. Circuit state
 * changes are reflected in the `integration_circuit_state` Prometheus gauge.
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<
    string,
    CircuitBreaker<[() => Promise<unknown>], unknown>
  >();

  constructor(
    @InjectMetric("integration_circuit_state")
    private readonly circuitStateGauge: Gauge<string>,
  ) {}

  private getBreaker(
    integration: string,
  ): CircuitBreaker<[() => Promise<unknown>], unknown> {
    if (!this.breakers.has(integration)) {
      const breaker = new CircuitBreaker(
        async (fn: () => Promise<unknown>) => fn(),
        {
          name: integration,
          errorThresholdPercentage: 50,
          volumeThreshold: 10,
          resetTimeout: 30_000,
          timeout: 10_000,
        },
      );

      breaker.on("open", () => {
        this.logger.warn(`Circuit OPEN for integration: ${integration}`);
        this.circuitStateGauge.set({ integration, state: "open" }, 1);
        this.circuitStateGauge.set({ integration, state: "closed" }, 0);
        this.circuitStateGauge.set({ integration, state: "half_open" }, 0);
      });
      breaker.on("close", () => {
        this.logger.log(`Circuit CLOSED for integration: ${integration}`);
        this.circuitStateGauge.set({ integration, state: "open" }, 0);
        this.circuitStateGauge.set({ integration, state: "closed" }, 1);
        this.circuitStateGauge.set({ integration, state: "half_open" }, 0);
      });
      breaker.on("halfOpen", () => {
        this.logger.log(`Circuit HALF-OPEN for integration: ${integration}`);
        this.circuitStateGauge.set({ integration, state: "open" }, 0);
        this.circuitStateGauge.set({ integration, state: "closed" }, 0);
        this.circuitStateGauge.set({ integration, state: "half_open" }, 1);
      });

      this.circuitStateGauge.set({ integration, state: "closed" }, 1);
      this.circuitStateGauge.set({ integration, state: "open" }, 0);
      this.circuitStateGauge.set({ integration, state: "half_open" }, 0);

      this.breakers.set(integration, breaker);
    }
    return this.breakers.get(integration)!;
  }

  /**
   * Fires a function through the named circuit breaker.
   *
   * @param integration - Identifier for the integration (used as breaker name)
   * @param fn - Async function to execute
   * @returns The resolved value of fn
   * @throws ServiceUnavailableException when the circuit is open
   * @throws The original error from fn when the circuit is closed
   */
  async fire<T>(integration: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await (this.getBreaker(integration).fire(fn) as Promise<T>);
    } catch (err) {
      if (err instanceof Error && err.message === "Breaker is open") {
        throw new ServiceUnavailableException({
          errorCode: "INTEGRATION_UNAVAILABLE",
          integration,
        });
      }
      throw err;
    }
  }

  /**
   * Returns the map of all registered circuit breakers.
   * Intended for testing and diagnostic use only.
   */
  getBreakers(): Map<
    string,
    CircuitBreaker<[() => Promise<unknown>], unknown>
  > {
    return this.breakers;
  }
}
