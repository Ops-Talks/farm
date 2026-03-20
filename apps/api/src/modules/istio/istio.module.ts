import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { KubernetesModule } from "../kubernetes/kubernetes.module";
import { IstioController } from "./istio.controller";
import { IstioService } from "./istio.service";
import { IstioMetricsService } from "./istio-metrics.service";

/**
 * Feature module for Istio service mesh integration.
 *
 * Provides:
 * - IstioService: CRD-backed access to VirtualService, PeerAuthentication,
 *   and AuthorizationPolicy resources via the Kubernetes CustomObjectsApi.
 * - IstioMetricsService: Prometheus query facade for Istio traffic metrics
 *   (RPS, error rate, latency percentiles).
 * - IstioController: REST endpoints under /api/v1/istio.
 *
 * All functionality degrades gracefully when Istio is not installed on the
 * target cluster (isIstioEnabled returns false; list methods return empty arrays).
 */
@Module({
  imports: [KubernetesModule, HttpModule],
  controllers: [IstioController],
  providers: [IstioService, IstioMetricsService],
  exports: [IstioService, IstioMetricsService],
})
export class IstioModule {}
