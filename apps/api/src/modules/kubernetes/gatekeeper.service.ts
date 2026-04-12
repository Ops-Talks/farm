import { Injectable, Logger } from "@nestjs/common";
import { KubernetesService } from "./kubernetes.service";

/**
 * Represents a mapped Gatekeeper ConstraintTemplate resource.
 */
export interface GatekeeperConstraintTemplate {
  /** ConstraintTemplate metadata.name */
  name: string;
  /** Always "templates.gatekeeper.sh" */
  group: string;
  /** Enforcement action applied when constraints of this template are violated */
  enforcementAction: "deny" | "warn" | "dryrun";
  /** Optional human-readable description from annotations */
  description?: string;
  /** Total number of violations across all Constraint instances of this template */
  violationCount: number;
}

/**
 * Represents a single violation entry emitted by a Gatekeeper Constraint.
 */
export interface GatekeeperViolation {
  /** Constraint kind, e.g. "K8sRequiredLabels" */
  kind: string;
  /** Name of the violating resource */
  name: string;
  /** Namespace of the violating resource, absent for cluster-scoped resources */
  namespace?: string;
  /** Human-readable violation message */
  message: string;
  /** Name of the Constraint resource that produced this violation */
  constraint: string;
  /** Enforcement action on the Constraint instance */
  enforcementAction: "deny" | "warn" | "dryrun";
}

/**
 * Raw shape of a Gatekeeper ConstraintTemplate object returned by the
 * Kubernetes CustomObjectsApi.  Only the fields consumed by this service
 * are declared.
 */
interface RawConstraintTemplate {
  metadata: {
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    crd?: {
      spec?: {
        names?: {
          kind?: string;
        };
      };
    };
    targets?: Array<{ rego?: string }>;
  };
}

/**
 * Raw list response from the CustomObjectsApi for constrainttemplates.
 */
interface RawConstraintTemplateList {
  items?: RawConstraintTemplate[];
  [key: string]: unknown;
}

/**
 * Raw shape of a Gatekeeper Constraint instance.
 */
interface RawConstraintInstance {
  metadata: { name: string };
  spec?: {
    enforcementAction?: string;
  };
  status?: {
    violations?: Array<{
      name: string;
      namespace?: string;
      message: string;
      enforcementAction?: string;
    }>;
  };
}

/**
 * Raw list response from the CustomObjectsApi for constraint instances.
 */
interface RawConstraintInstanceList {
  items?: RawConstraintInstance[];
  [key: string]: unknown;
}

/**
 * Service for reading Gatekeeper ConstraintTemplate and Constraint resources
 * from the Kubernetes cluster.
 *
 * The service degrades gracefully when:
 * - The Kubernetes client is not configured (returns empty arrays / false)
 * - Gatekeeper CRDs are not installed (HTTP 404 returns empty arrays)
 */
@Injectable()
export class GatekeeperService {
  private readonly logger = new Logger(GatekeeperService.name);

  private readonly TEMPLATES_GROUP = "templates.gatekeeper.sh";
  private readonly TEMPLATES_VERSION = "v1";
  private readonly TEMPLATES_PLURAL = "constrainttemplates";
  private readonly CONSTRAINTS_GROUP = "constraints.gatekeeper.sh";
  private readonly CONSTRAINTS_VERSION = "v1beta1";
  private readonly GATEKEEPER_NAMESPACE = "gatekeeper-system";

  constructor(private readonly kubernetesService: KubernetesService) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Determines whether Gatekeeper is installed in the cluster by checking
   * for the presence of the "gatekeeper-system" namespace.
   *
   * @returns true when the gatekeeper-system namespace exists, false otherwise
   */
  async isGatekeeperEnabled(): Promise<boolean> {
    const api = this.kubernetesService.getCoreV1Api();
    if (!api) {
      return false;
    }

    try {
      const response = await api.listNamespace();
      const namespaces: string[] = (
        (response as { items?: Array<{ metadata?: { name?: string } }> })
          .items ?? []
      ).map((ns) => ns.metadata?.name ?? "");
      return namespaces.includes(this.GATEKEEPER_NAMESPACE);
    } catch (error) {
      const status = (error as { response?: { statusCode?: number } })?.response
        ?.statusCode;
      if (status === 404) {
        this.logger.debug(
          "Namespace API returned 404; Gatekeeper not available",
        );
        return false;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to check for Gatekeeper namespace: ${message}`);
      return false;
    }
  }

  /**
   * Lists all Gatekeeper ConstraintTemplate resources installed in the cluster.
   * For each template, derives enforcement action and violation count from its
   * associated Constraint instances.
   * Returns an empty array gracefully when the CRD is not installed.
   *
   * @returns Array of mapped ConstraintTemplate descriptors
   */
  async listConstraintTemplates(): Promise<GatekeeperConstraintTemplate[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      this.logger.warn(
        "Kubernetes client not available; returning empty constraint template list",
      );
      return [];
    }

    try {
      const response = (await api.listClusterCustomObject({
        group: this.TEMPLATES_GROUP,
        version: this.TEMPLATES_VERSION,
        plural: this.TEMPLATES_PLURAL,
      })) as RawConstraintTemplateList;

      const templates = response.items ?? [];
      const results: GatekeeperConstraintTemplate[] = [];

      for (const item of templates) {
        const base = this.mapConstraintTemplate(item);
        const plural = item.metadata.name.toLowerCase();

        try {
          const constraintResponse = (await api.listClusterCustomObject({
            group: this.CONSTRAINTS_GROUP,
            version: this.CONSTRAINTS_VERSION,
            plural,
          })) as RawConstraintInstanceList;

          const instances = constraintResponse.items ?? [];
          let totalViolations = 0;
          let derivedAction: "deny" | "warn" | "dryrun" = "warn";

          for (const instance of instances) {
            totalViolations += instance.status?.violations?.length ?? 0;
            const action = instance.spec?.enforcementAction;
            if (action) {
              derivedAction = this.normalizeEnforcementAction(action);
            }
          }

          base.enforcementAction = derivedAction;
          base.violationCount = totalViolations;
        } catch (error) {
          const status = (error as { response?: { statusCode?: number } })
            ?.response?.statusCode;
          if (status !== 404) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.debug(
              `Failed to list constraints for template "${plural}": ${message}`,
            );
          }
        }

        results.push(base);
      }

      return results;
    } catch (error) {
      const status = (error as { response?: { statusCode?: number } })?.response
        ?.statusCode;
      if (status === 404) {
        this.logger.debug(
          "Gatekeeper ConstraintTemplate CRD not installed; returning empty list",
        );
        return [];
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list ConstraintTemplates: ${message}`);
      return [];
    }
  }

  /**
   * Aggregates violations from all Gatekeeper Constraint instances.
   * For each ConstraintTemplate, lists its Constraint instances and collects
   * all entries from each instance's status.violations array.
   *
   * An optional namespace filter narrows results to violations in that
   * namespace (cluster-scoped violations are always included).
   *
   * @param namespace - Optional namespace to filter violations
   * @returns Flat array of mapped GatekeeperViolation entries
   */
  async listViolations(namespace?: string): Promise<GatekeeperViolation[]> {
    const api = this.kubernetesService.getCustomObjectsApi();
    if (!api) {
      return [];
    }

    const templates = await this.listConstraintTemplates();
    if (templates.length === 0) {
      return [];
    }

    const violations: GatekeeperViolation[] = [];

    for (const template of templates) {
      const plural = template.name.toLowerCase();
      const kind = template.name;

      try {
        const response = (await api.listClusterCustomObject({
          group: this.CONSTRAINTS_GROUP,
          version: this.CONSTRAINTS_VERSION,
          plural,
        })) as RawConstraintInstanceList;

        for (const instance of response.items ?? []) {
          for (const v of instance.status?.violations ?? []) {
            if (namespace && v.namespace && v.namespace !== namespace) {
              continue;
            }
            violations.push({
              kind,
              name: v.name,
              namespace: v.namespace,
              message: v.message,
              constraint: instance.metadata.name,
              enforcementAction: this.normalizeEnforcementAction(
                v.enforcementAction ?? instance.spec?.enforcementAction,
              ),
            });
          }
        }
      } catch (error) {
        const status = (error as { response?: { statusCode?: number } })
          ?.response?.statusCode;
        if (status === 404) {
          this.logger.debug(`Constraint CRD "${plural}" not found; skipping`);
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to list violations for constraint "${plural}": ${message}`,
          );
        }
      }
    }

    return violations;
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  /**
   * Maps a raw ConstraintTemplate API object to the typed
   * GatekeeperConstraintTemplate shape.
   *
   * @param item - Raw ConstraintTemplate object from the Kubernetes API
   * @returns Typed GatekeeperConstraintTemplate
   */
  private mapConstraintTemplate(
    item: RawConstraintTemplate,
  ): GatekeeperConstraintTemplate {
    const annotations = item.metadata.annotations ?? {};
    const description =
      annotations["metadata.gatekeeper.sh/description"] ??
      annotations["description"] ??
      undefined;

    return {
      name: item.metadata.name,
      group: this.TEMPLATES_GROUP,
      enforcementAction: "warn",
      description,
      violationCount: 0,
    };
  }

  /**
   * Normalizes an enforcement action string to a typed union value,
   * defaulting to "warn" when the value is unrecognized or absent.
   *
   * @param value - Raw enforcement action string from the API
   * @returns Typed enforcement action
   */
  private normalizeEnforcementAction(
    value?: string,
  ): "deny" | "warn" | "dryrun" {
    if (value === "deny" || value === "warn" || value === "dryrun") {
      return value;
    }
    return "warn";
  }
}
