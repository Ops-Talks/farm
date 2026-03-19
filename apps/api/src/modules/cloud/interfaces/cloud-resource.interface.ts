/**
 * Represents a cloud resource discovered from a cloud provider.
 */
export interface CloudResource {
  /** Cloud provider identifier */
  provider: "aws" | "gcp" | "azure";
  /** ARN (AWS), full resource name (GCP), or Azure resource ID */
  resourceId: string;
  /** Resource type, e.g. "ecs-service", "cloud-run", "container-app" */
  resourceType: string;
  /** Human-readable resource name */
  name: string;
  /** Region or location where the resource resides */
  region: string;
  /** Key-value tags or labels applied to the resource */
  tags: Record<string, string>;
  /** Component ID resolved from the farm:component or farm.io/component tag */
  linkedComponentId?: string;
}
