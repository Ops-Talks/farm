import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import { RegistryService } from "../registry/registry.service";
import { IstioService } from "../istio/istio.service";
import { LinkerdService } from "../linkerd/linkerd.service";

export interface FeatureAvailabilityMap {
  kubernetes: { available: boolean };
  cost: { available: boolean };
  registry: { available: boolean };
  helm: { available: boolean };
  istio: { available: boolean };
  linkerd: { available: boolean };
}

/**
 * Aggregates availability status for all optional platform features.
 */
@Injectable()
export class FeaturesService {
  constructor(
    private readonly kubernetesService: KubernetesService,
    private readonly registryService: RegistryService,
    private readonly istioService: IstioService,
    private readonly linkerdService: LinkerdService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns the availability status for each optional platform feature.
   */
  async getAvailability(): Promise<FeatureAvailabilityMap> {
    const kubernetesAvailable = this.kubernetesService.isEnabled();
    const registryAvailable = this.registryService.adapterType !== null;
    const istioAvailable =
      kubernetesAvailable && (await this.istioService.isIstioEnabled());
    const linkerdAvailable =
      kubernetesAvailable && (await this.linkerdService.isLinkerdEnabled());
    const opencostUrl = this.configService.get<string>(
      "OPENCOST_URL",
      "http://localhost:9090",
    );
    let costAvailable = false;
    try {
      const res = await globalThis.fetch(`${opencostUrl}/healthz`, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      costAvailable = res.ok;
    } catch {
      costAvailable = false;
    }
    return {
      kubernetes: { available: kubernetesAvailable },
      cost: { available: costAvailable },
      registry: { available: registryAvailable },
      helm: { available: kubernetesAvailable },
      istio: { available: istioAvailable },
      linkerd: { available: linkerdAvailable },
    };
  }
}
