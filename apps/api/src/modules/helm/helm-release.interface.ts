/**
 * Represents a Helm release discovered from Kubernetes Secrets.
 * Helm 3 stores release state as Secrets with type "helm.sh/release.v1".
 */
export interface HelmRelease {
  /** Helm release name */
  name: string;
  /** Kubernetes namespace where the release is installed */
  namespace: string;
  /** Chart name, e.g. "postgresql" */
  chart: string;
  /** Chart version, e.g. "12.1.0" */
  chartVersion: string;
  /** Application version bundled in the chart */
  appVersion: string;
  /**
   * Release status reported by Helm.
   * Possible values: "deployed" | "failed" | "pending-install" |
   * "pending-upgrade" | "pending-rollback" | "uninstalling" | "superseded"
   */
  status: string;
  /** Release revision number */
  revision: number;
  /** ISO-8601 timestamp of the last deployment */
  updatedAt: string;
}
