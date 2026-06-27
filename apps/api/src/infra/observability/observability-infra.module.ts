import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import {
  makeCounterProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";
import { BusinessMetricsModule } from "../../common/metrics/business-metrics.module";
import { DatabaseMetricsModule } from "../../common/metrics/database-metrics.module";
import { ObservabilityModule } from "../../common/observability/observability.module";
import { MetricsInterceptor } from "../../common/interceptors/metrics.interceptor";

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
      defaultMetrics: { enabled: true },
    }),
    BusinessMetricsModule,
    DatabaseMetricsModule,
    ObservabilityModule,
  ],
  providers: [
    makeCounterProvider({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
    }),
    makeHistogramProvider({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      enableExemplars: true,
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [
    PrometheusModule,
    BusinessMetricsModule,
    DatabaseMetricsModule,
    ObservabilityModule,
  ],
})
export class ObservabilityInfraModule {}
