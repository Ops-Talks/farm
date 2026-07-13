import { RegistryType } from "../enums/registry-type.enum";

export interface RepositoryDto {
  name: string;
  uri: string;
  description?: string;
}

export interface TagDto {
  tag: string;
  digest?: string;
  pushedAt?: Date;
  sizeBytes?: number;
}

export interface ManifestDto {
  digest: string;
  mediaType: string;
  sizeBytes?: number;
  pushedAt?: Date;
  tags: string[];
}

export interface VulnerabilityDto {
  cveId: string;
  severity:
    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | "UNDEFINED";
  packageName: string;
  installedVersion?: string;
  fixedVersion?: string;
  description?: string;
}

export interface ScanResultDto {
  status: "COMPLETE" | "PENDING" | "FAILED" | "UNSUPPORTED";
  vulnerabilities: VulnerabilityDto[];
}

export interface IRegistryAdapter {
  readonly type: RegistryType;
  listRepositories(): Promise<RepositoryDto[]>;
  listTags(repo: string): Promise<TagDto[]>;
  getManifest(repo: string, tag: string): Promise<ManifestDto>;
  getScanResults(repo: string, tag: string): Promise<ScanResultDto>;
  /** Harbor-specific: lists replication policies. Only implemented by HarborAdapter. */
  listReplicationPolicies?(): Promise<HarborReplicationPolicy[]>;
}

/** A Harbor replication policy (rule). */
export interface HarborReplicationPolicy {
  id: number;
  name: string;
  /** Source registry name or URL */
  srcRegistry: string;
  /** Destination registry name or URL */
  destRegistry: string;
  /** Resource filters (image name patterns) */
  filters: string[];
  /** Trigger type: "manual" | "scheduled" | "event_based" */
  triggerType: string;
  enabled: boolean;
  /** Overall status of the last execution: "succeed" | "failed" | "running" | "stopped" | null */
  lastExecutionStatus: string | null;
}
