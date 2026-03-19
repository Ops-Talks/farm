// Farm API type definitions
// Mirrors the backend DTOs for type-safe API communication

// -- Enums (re-exported from @farm/types) --

import {
  ComponentKind,
  ComponentLifecycle,
  ComponentKindGroup,
  DeploymentStatus,
  EnvironmentType,
  TeamType,
  FarmEvent,
  PipelineRunStatus,
} from "@farm/types";

export {
  ComponentKind,
  ComponentLifecycle,
  ComponentKindGroup,
  DeploymentStatus,
  EnvironmentType,
  TeamType,
  FarmEvent,
  PipelineRunStatus,
};

// -- Entities --

export interface ComponentLink {
  title: string;
  url: string;
  icon?: string;
}

// -- Helm Chart configuration attached to a catalog component --

export interface HelmChart {
  /** Helm repository URL (e.g. https://charts.bitnami.com/bitnami) */
  repo: string;
  /** Chart name within the repository */
  chart: string;
  /** Pinned chart version (semver) */
  version?: string;
  /** Reference to a values file or ConfigMap containing chart overrides */
  valuesRef?: string;
}

export interface CatalogComponent {
  id: string;
  name: string;
  kind: ComponentKind;
  description?: string;
  owner: string;
  teamId?: string;
  team?: Team;
  lifecycle: ComponentLifecycle;
  tags?: string[];
  links?: ComponentLink[];
  metadata?: Record<string, unknown>;
  dependencies?: CatalogComponent[];
  /** Optional URL pointing to the source repository (GitHub, GitLab, etc.) */
  repositoryUrl?: string;
  /** Optional ArgoCD application name linked to this component (FARM-E35) */
  argocdApp?: string;
  /** Optional VCS URL used to filter CI pipelines (FARM-E35) */
  vcsUrl?: string;
  /** Optional Helm chart configuration (FARM-E36) */
  helmChart?: HelmChart;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  version: string;
  status: DeploymentStatus;
  deployedBy?: string;
  commitSha?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  componentId: string;
  component?: CatalogComponent;
  environmentId: string;
  environment?: Environment;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  type: EnvironmentType;
  order: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: TeamType;
  contactEmail?: string;
  slackChannel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// -- Auth DTOs --

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  username: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// -- Common DTOs --

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export interface PaginationQuery {
  skip?: number;
  take?: number;
}

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

// -- WebSocket Event Payloads --

export interface ComponentEventPayload {
  id: string;
  name: string;
  kind: string;
  owner: string;
  timestamp: string;
}

export interface DeploymentEventPayload {
  id: string;
  componentId: string;
  environmentId: string;
  version: string;
  status: string;
  timestamp: string;
}

// -- Health --

export interface HealthStatus {
  status: "ok" | "error";
  info: Record<string, { status: string; [key: string]: unknown }>;
  error: Record<string, { status: string; [key: string]: unknown }>;
  details: Record<string, { status: string; [key: string]: unknown }>;
}

// -- Deployment Matrix --

export interface DeploymentMatrixEnvironment {
  environmentId: string;
  environmentName: string;
  version: string | null;
  status: DeploymentStatus | null;
  deployedAt: string | null;
}

export interface DeploymentMatrixRow {
  id: string;
  name: string;
  kind: string;
  environments: DeploymentMatrixEnvironment[];
}

// -- Queues and Jobs --

export interface JobCounts {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
  paused: number;
  prioritized: number;
}

export interface QueueInfo {
  name: string;
  isPaused: boolean;
  jobCounts: JobCounts;
}

export interface JobInfo {
  id: string;
  queueName: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
  returnValue?: unknown;
  failedReason?: string;
  attemptsMade: number;
  progress: number | object;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  stacktrace?: string[];
}

// -- Observability --

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

export interface RequestsByStatus {
  "2xx": number;
  "4xx": number;
  "5xx": number;
  other: number;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface ObservabilitySummary {
  uptime: number;
  memory: MemoryUsage;
  totalRequests: number;
  requestsByStatus: RequestsByStatus;
  latencyPercentiles: LatencyPercentiles;
  grafanaUrl: string | null;
}

// -- Organizations --

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a single member of an organization, as returned by the members
 * sub-resource endpoints under /api/v1/organizations/:id/members.
 */
export interface MemberResponse {
  userId: string;
  username: string;
  email: string;
  /** The role this user holds within the organization. */
  role: "owner" | "admin" | "member";
  /** ISO-8601 timestamp of when the user joined the organization. */
  joinedAt: string;
}

// -- Documentation --

export interface DocumentationEntry {
  id: string;
  title: string;
  sourceUrl: string;
  componentId: string;
  author: string;
  version: string;
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentationTreeNode {
  id: string;
  title: string;
  parentId: string | null;
  order: number;
  children: DocumentationTreeNode[];
}

export interface DocumentationSearchResult {
  id: string;
  title: string;
  componentId: string;
  score: number;
}

// -- Pipelines --

export interface PipelineStage {
  id: string;
  name: string;
  type:
    | "script"
    | "approval"
    | "deploy"
    | "notify"
    | "build"
    | "aws-ecs"
    | "aws-lambda"
    | "gcp-cloud-run"
    | "azure-container-apps";
  order: number;
  config: Record<string, unknown>;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  organizationId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageResult {
  stageId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  output?: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: PipelineRunStatus;
  triggeredBy: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  logs?: string;
  stageResults?: PipelineStageResult[];
  createdAt: string;
  updatedAt: string;
}

// -- Pipeline WebSocket Payloads --

export interface PipelineLogPayload {
  runId: string;
  stage: string;
  message: string;
}

// -- Alerting Rules --

export interface AlertingRule {
  id: string;
  name: string;
  description?: string;
  query: string;
  duration: string;
  severity: "critical" | "warning" | "info";
  componentId?: string;
  environmentId?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  enabled: boolean;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// -- Prometheus / Metrics --

export interface PrometheusResult {
  metric: Record<string, string>;
  values: [number, string][];
}

export interface PrometheusRangeResponse {
  status: "success" | "error";
  data: {
    resultType: string;
    result: PrometheusResult[];
  } | null;
  error?: string;
}

// -- Jaeger / Traces --

export interface JaegerSpan {
  traceID: string;
  spanID: string;
  operationName: string;
  references: { refType: string; traceID: string; spanID: string }[];
  startTime: number; // microseconds
  duration: number; // microseconds
  tags: { key: string; type: string; value: unknown }[];
  logs: { timestamp: number; fields: { key: string; value: string }[] }[];
  processID: string;
  warnings: string[] | null;
}

export interface JaegerProcess {
  serviceName: string;
  tags: { key: string; type: string; value: unknown }[];
}

export interface JaegerTrace {
  traceID: string;
  spans: JaegerSpan[];
  processes: Record<string, JaegerProcess>;
  warnings: string[] | null;
}

export interface JaegerTracesResponse {
  data: JaegerTrace[] | null;
  total: number;
  limit: number;
  offset: number;
  errors: null | { code: number; msg: string }[];
  error?: string;
}

// -- Loki / Logs --

export interface LokiStreamValue {
  stream: Record<string, string>;
  values: [string, string][]; // [nanosecond timestamp string, log line]
}

export interface LokiLogsResponse {
  status: "success" | "error";
  data?: {
    resultType: string;
    result: LokiStreamValue[];
  };
  error?: string;
}

export interface LokiLabelsResponse {
  status: "success" | "error";
  data?: string[];
  error?: string;
}

// -- Audit Log (WebSocket payload) --

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// -- Plugin system --

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  menuItems?: { label: string; path: string; icon?: string }[];
  routes?: { path: string; module: string }[];
}

// -- Helm Releases (FARM-E36) --

/** A deployed Helm release discovered from the cluster. */
export interface HelmRelease {
  name: string;
  namespace: string;
  /** Chart name + version string as returned by Helm (e.g. "nginx-15.1.0") */
  chart: string;
  chartVersion: string;
  appVersion: string;
  /** Release status: "deployed", "failed", "pending-install", etc. */
  status: string;
  revision: number;
  updatedAt: string;
}

/** Response from POST /api/v1/helm/releases/sync */
export interface HelmSyncResult {
  synced: number;
  errors: string[];
}

// -- CI/CD External Integrations (FARM-E35) --

/** A stored credential for an external CI/CD integration. */
export interface IntegrationCredential {
  id: string;
  orgId: string;
  type: "argocd" | "circleci" | "jenkins" | "travisci";
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** An ArgoCD Application resource returned from the cluster. */
export interface ArgoCDApplication {
  name: string;
  namespace: string;
  status: {
    health: {
      status: string; // e.g. "Healthy", "Degraded", "Progressing", "Unknown"
    };
    sync: {
      status: string; // e.g. "Synced", "OutOfSync", "Unknown"
    };
    operationState?: {
      startedAt?: string;
      finishedAt?: string;
    };
  };
  spec: {
    source: {
      repoURL: string;
      targetRevision: string;
    };
  };
}

/** A CircleCI pipeline object. */
export interface CircleCIPipeline {
  id: string;
  number: number;
  project_slug: string;
  state: string; // e.g. "created", "errored", "setup-pending", "setup", "pending"
  trigger: {
    type: string; // e.g. "webhook", "schedule", "api"
  };
  updated_at: string;
}

/** A Jenkins job object. */
export interface JenkinsJob {
  name: string;
  url: string;
  color: string; // e.g. "blue" (SUCCESS), "red" (FAILURE), "yellow" (UNSTABLE), "notbuilt"
  lastBuild?: {
    number: number;
    result: string | null; // "SUCCESS" | "FAILURE" | "UNSTABLE" | "ABORTED" | null
    timestamp: number;
    duration: number;
  };
}

/** A Travis CI build object. */
export interface TravisBuild {
  id: number;
  number: string;
  state: string; // e.g. "passed", "failed", "errored", "canceled", "created", "started"
  started_at: string | null;
  finished_at: string | null;
  branch: {
    name: string;
  };
  repository: {
    slug: string;
  };
}

// -- Kubernetes CRDs (FARM-E37) --

/** A Custom Resource Definition discovered in the cluster. */
export interface KubernetesCRD {
  name: string;
  group: string;
  version: string;
  scope: string;
  kind: string;
  /** Operator / display group name derived from group prefix */
  displayTemplate: string;
}

/** An Argo Rollout resource discovered in the cluster. */
export interface KubernetesRollout {
  name: string;
  namespace: string;
  /** e.g. "Healthy", "Degraded", "Progressing", "Paused" */
  phase: string;
  message?: string;
  /** Current canary traffic weight (0-100), present for canary rollouts */
  canaryWeight?: number;
  /** Active revision ref for blue-green rollouts */
  blueGreenActive?: string;
  /** Preview revision ref for blue-green rollouts */
  blueGreenPreview?: string;
  /** Analysis run results attached to this rollout */
  analysisRunResults?: { name: string; phase: string }[];
  updatedAt: string;
}
