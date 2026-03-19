import { Injectable, Logger } from "@nestjs/common";
import * as yaml from "js-yaml";
import { TagPolicyService } from "./tag-policy.service";

/**
 * Maps Farm resource type identifiers to their corresponding Kubernetes kind
 * names used in Kyverno ClusterPolicy match rules.
 * The wildcard "*" maps to "*" which matches all resource kinds.
 */
const KIND_MAP: Record<string, string> = {
  "k8s-deployment": "Deployment",
  "k8s-pod": "Pod",
  "k8s-service": "Service",
  "k8s-statefulset": "StatefulSet",
  "k8s-daemonset": "DaemonSet",
  "*": "*",
};

/**
 * Service that generates Kyverno ClusterPolicy YAML manifests from Farm
 * TagPolicy records.
 *
 * The exported YAML can be applied directly to a Kubernetes cluster running
 * Kyverno to enforce the same required-label rules defined in Farm.
 */
@Injectable()
export class KyvernoExportService {
  private readonly logger = new Logger(KyvernoExportService.name);

  constructor(private readonly tagPolicyService: TagPolicyService) {}

  /**
   * Loads a TagPolicy by ID and generates a Kyverno ClusterPolicy YAML
   * manifest that enforces the same required-label rules.
   *
   * Severity mapping:
   * - "error"   → validationFailureAction: Enforce
   * - "warning" → validationFailureAction: Audit
   *
   * @param tagPolicyId - UUID of the TagPolicy to export
   * @returns An object containing the YAML string and a safe filename
   */
  async exportTagPolicyAsClusterPolicy(
    tagPolicyId: string,
  ): Promise<{ yaml: string; filename: string }> {
    const policy = await this.tagPolicyService.findOne(tagPolicyId);

    const sanitizedType = this.sanitizeResourceType(policy.resourceType);
    const policyName = `farm-require-tags-${sanitizedType}`;
    const validationFailureAction =
      policy.severity === "error" ? "Enforce" : "Audit";

    const k8sKind = this.resolveKind(policy.resourceType);

    // Build the labels pattern object: each required key maps to "?*" (any
    // non-empty value) following the Kyverno pattern syntax.
    const labelsPattern: Record<string, string> = {};
    for (const key of policy.requiredKeys) {
      labelsPattern[key] = "?*";
    }

    const clusterPolicy = {
      apiVersion: "kyverno.io/v1",
      kind: "ClusterPolicy",
      metadata: {
        name: policyName,
        annotations: {
          "farm.io/policy-id": tagPolicyId,
          "farm.io/generated-at": new Date().toISOString(),
        },
      },
      spec: {
        validationFailureAction,
        rules: [
          {
            name: "require-farm-tags",
            match: {
              any: [
                {
                  resources: {
                    kinds: [k8sKind],
                  },
                },
              ],
            },
            validate: {
              message: `Resource must have required Farm tags: ${policy.requiredKeys.join(", ")}`,
              pattern: {
                metadata: {
                  labels: labelsPattern,
                },
              },
            },
          },
        ],
      },
    };

    const yamlString = yaml.dump(clusterPolicy, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    const filename = `${policyName}.yaml`;

    this.logger.log(
      `Exported tag policy ${tagPolicyId} as Kyverno ClusterPolicy: ${filename}`,
    );

    return { yaml: yamlString, filename };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolves the Kubernetes resource kind for a given Farm resource type.
   * Falls back to capitalizing the first letter of the resource type when no
   * explicit mapping is found.
   *
   * @param resourceType - Farm resource type identifier (e.g. "k8s-deployment")
   * @returns Kubernetes kind string (e.g. "Deployment")
   */
  private resolveKind(resourceType: string): string {
    if (resourceType in KIND_MAP) {
      return KIND_MAP[resourceType];
    }
    // Fallback: capitalize first letter of the resource type.
    return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
  }

  /**
   * Produces a DNS-label-safe slug from a resource type string.
   * Converts to lowercase and replaces all non-alphanumeric characters with
   * hyphens, collapsing repeated hyphens and trimming leading/trailing ones.
   *
   * @param resourceType - Raw resource type string (e.g. "k8s-deployment", "*")
   * @returns Sanitized slug suitable for use in a Kubernetes resource name
   */
  private sanitizeResourceType(resourceType: string): string {
    return (
      resourceType
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "all"
    );
  }
}
