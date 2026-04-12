import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { KubernetesModule } from "../kubernetes/kubernetes.module";
import { LinkerdController } from "./linkerd.controller";
import { LinkerdService } from "./linkerd.service";
import { LinkerdMetricsService } from "./linkerd-metrics.service";

/**
 * Feature module for Linkerd 2.x service mesh integration.
 *
 * Provides:
 * - LinkerdService: CRD-backed access to ServerAuthorization,
 *   AuthorizationPolicy, and ServiceProfile resources.
 * - LinkerdMetricsService: Prometheus query facade for Linkerd traffic metrics
 *   (RPS, failure rate, latency percentiles, topology).
 * - LinkerdController: REST endpoints under /api/v1/linkerd.
 *
 * All functionality degrades gracefully when Linkerd is not installed
 * (isLinkerdEnabled returns false; list methods return empty arrays).
 */
@Module({
  imports: [KubernetesModule, HttpModule],
  controllers: [LinkerdController],
  providers: [LinkerdService, LinkerdMetricsService],
  exports: [LinkerdService, LinkerdMetricsService],
})
export class LinkerdModule {}
