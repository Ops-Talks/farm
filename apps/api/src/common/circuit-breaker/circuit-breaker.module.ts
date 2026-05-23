import { Global, Module } from "@nestjs/common";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { CircuitBreakerService } from "./circuit-breaker.service";

/**
 * Global module that provides the CircuitBreakerService and the associated
 * Prometheus gauge. Marking the module as @Global() ensures the service is
 * available to all feature modules without requiring explicit imports.
 */
@Global()
@Module({
  providers: [
    makeGaugeProvider({
      name: "integration_circuit_state",
      help: "Circuit breaker state per integration (0=inactive, 1=active). Labels: integration, state (open|closed|half_open)",
      labelNames: ["integration", "state"],
    }),
    CircuitBreakerService,
  ],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
