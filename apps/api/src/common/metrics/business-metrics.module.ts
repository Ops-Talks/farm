import { Global, Module } from "@nestjs/common";
import { makeCounterProvider, getToken } from "@willsoto/nestjs-prometheus";

/**
 * Global module that declares and exports all business-level Prometheus counter
 * metrics. Marking the module as @Global() makes every exported provider
 * injectable across all feature modules without requiring explicit imports.
 *
 * Providers use getOrCreateMetric under the hood, so re-importing this module
 * in tests (or registering the same metric name twice) is safe — prom-client
 * returns the existing metric instance instead of throwing.
 *
 * Counter values are per-process and are correctly scraped as such in
 * multi-replica deployments: each Prometheus scrape target (replica) exposes
 * its own counter independently. Aggregation across replicas is the
 * responsibility of the Prometheus server (typically via sum() in PromQL).
 * No cross-replica coordination is needed.
 */
@Global()
@Module({
  providers: [
    makeCounterProvider({
      name: "pipeline_executions_total",
      help: "Total number of completed pipeline run executions",
      labelNames: ["status", "pipeline_id"],
    }),
    makeCounterProvider({
      name: "component_operations_total",
      help: "Total number of catalog component CRUD operations",
      labelNames: ["operation"],
    }),
    makeCounterProvider({
      name: "deployment_operations_total",
      help: "Total number of deployment create and update operations",
      labelNames: ["operation", "status"],
    }),
    makeCounterProvider({
      name: "team_operations_total",
      help: "Total number of team CRUD operations",
      labelNames: ["operation"],
    }),
  ],
  exports: [
    getToken("pipeline_executions_total"),
    getToken("component_operations_total"),
    getToken("deployment_operations_total"),
    getToken("team_operations_total"),
  ],
})
export class BusinessMetricsModule {}
