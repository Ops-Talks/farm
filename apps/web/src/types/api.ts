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

// -- Container image metadata attached to a catalog component --

export interface ContainerImageMetadata {
  /** Registry type identifier, e.g. "ecr", "gcr", "dockerhub" */
  registry: string;
  /** Image name/path, e.g. "myorg/myapp" */
  image: string;
  /** Latest resolved tag, e.g. "1.2.3" */
  latestTag?: string;
  /** Image digest, e.g. "sha256:abc123..." */
  digest?: string;
  /** When the image was last pushed */
  pushedAt?: string;
}

// -- Container vulnerability (FARM-S244) --

export type VulnerabilitySeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFORMATIONAL'
  | 'UNDEFINED';

export interface ContainerVulnerability {
  id: string;
  componentId: string;
  registry: string;
  image: string;
  tag: string;
  severity: VulnerabilitySeverity;
  cveId: string;
  packageName: string;
  installedVersion?: string | null;
  fixedVersion?: string | null;
  description?: string | null;
  scannedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilitySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  total: number;
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
  /** Container image metadata (FARM-S243) */
  containerImage?: ContainerImageMetadata | null;
  /** Optional Kubernetes namespace for Istio service mesh integration (FARM-E42) */
  namespace?: string;
  /** Optional monthly cost budget in USD for FinOps alerting (Phase 19) */
  costBudgetUsd?: number | null;
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

/**
 * Represents a pending (or resolved) email invitation to join an organization.
 * Returned by the invitations sub-resource endpoints under
 * /api/v1/organizations/:id/invitations.
 */
export interface OrgInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "declined";
  /** ISO-8601 timestamp when the invitation expires. */
  expiresAt: string;
  /** ISO-8601 timestamp when the invitation was created. */
  createdAt: string;
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

export interface DocumentationBuild {
  id: string;
  componentId: string;
  version: string;
  sourceType: 'mkdocs' | 'markdown';
  status: 'building' | 'ready' | 'failed';
  buildLog: string | null;
  artifactsPath: string | null;
  triggeredAt: string;
  completedAt: string | null;
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

// -- Resource Tagging Governance (FARM-E39) --

/** A tag policy that mandates required keys on a given resource type. */
export interface TagPolicy {
  id: string;
  orgId: string;
  /** Resource type to which this policy applies; use "*" for all types. */
  resourceType: string;
  /** Keys that must be present on every matching cloud resource. */
  requiredKeys: string[];
  /** How violations are classified. */
  severity: 'warning' | 'error';
  createdAt: string;
  updatedAt: string;
}

/** A cloud resource that violates one or more tag policies. */
export interface ResourceViolation {
  id: string;
  orgId: string;
  resourceId: string;
  resourceType: string;
  provider: string;
  /** Tag keys that are missing on the resource. */
  missingKeys: string[];
  /** Component UUID this resource is linked to (if any). */
  linkedComponentId?: string;
  detectedAt: string;
  resolvedAt?: string;
}

/** Aggregated compliance data for an organisation. */
export interface ComplianceSummary {
  totalResources: number;
  totalViolations: number;
  /** 0–100 percentage of compliant resources. */
  complianceRate: number;
  byProvider: Record<string, { total: number; violations: number }>;
  byResourceType: Record<string, { total: number; violations: number }>;
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

// -- Operators & Runtime Info (Phase 16) --

/** An OLM-managed operator discovered in the cluster. */
export interface OperatorInfo {
  name: string;
  displayName: string;
  version: string;
  namespace: string;
  phase: string;
  description: string;
  icon?: string;
  provider?: string;
  createdAt: string;
  customResourceDefinitions: Array<{
    name: string;
    version: string;
    kind: string;
    description: string;
  }>;
}

/** A custom resource instance managed by an operator. */
export interface CustomResourceInstance {
  name: string;
  namespace: string;
  kind: string;
  apiVersion: string;
  status?: Record<string, unknown>;
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
  createdAt: string;
}

/** A binding between an operator and a catalog component. */
export interface OperatorBinding {
  id: string;
  operatorName: string;
  operatorNamespace: string;
  componentId: string;
  component?: CatalogComponent;
  addedAt: string;
  organizationId?: string;
}

/** Runtime info for a cluster node. */
export interface NodeRuntimeInfo {
  nodeName: string;
  runtimeName: string;
  runtimeVersion: string;
  kernelVersion: string;
  osImage: string;
  architecture: string;
}

/** CRI-O storage metrics for a node. */
export interface CrioStorageMetrics {
  nodeName: string;
  available: boolean;
  imageLayers?: number;
  cacheHitRate?: number;
  storageUsageBytes?: number;
}

// -- Dragonfly P2P CDN (FARM-S245 / FARM-S246) --

export interface DragonflyComponentInfo {
  component: "manager" | "scheduler" | "dfdaemon";
  namespace: string;
  version: string;
  readyReplicas: number;
  totalReplicas: number;
  workloadKind: "Deployment" | "DaemonSet";
}

export interface DragonflyInstallStatus {
  status: "not-installed" | "degraded" | "healthy";
  version: string | null;
  components: DragonflyComponentInfo[];
}

export interface DragonflyTaskMetrics {
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  activeTasks: number;
  totalPeers: number;
}

export interface DragonflyTask {
  image: string;
  peerCount: number;
  bytesTransferred: number;
  accelerationRatio: number;
  durationSeconds: number;
  status: "succeeded" | "failed" | "running";
}

export interface DragonflyPeer {
  peerId: string;
  ip: string;
  status: "active" | "idle";
  taskCount: number;
}

// -- Keycloak / Enterprise SSO (FARM-E41) --

/** A stored Keycloak OIDC credential for an organisation. */
export interface KeycloakCredential {
  id: string;
  orgId: string;
  name: string;
  type: 'keycloak';
  createdAt: string;
  updatedAt: string;
}

// -- Istio Service Mesh (FARM-E42) --

export interface IstioVirtualService {
  name: string;
  namespace: string;
  hosts: string[];
  gateways: string[];
  routes: { destination: string; weight: number; port?: number }[];
}

export interface IstioPeerAuthentication {
  name: string;
  namespace: string;
  mtlsMode: 'STRICT' | 'PERMISSIVE' | 'DISABLE' | 'UNSET';
}

export interface IstioAuthorizationPolicy {
  name: string;
  namespace: string;
  action: 'ALLOW' | 'DENY' | 'AUDIT' | 'CUSTOM';
  hasNoRules: boolean;
  rules: { from?: string[]; to?: string[]; conditions?: string[] }[];
}

export interface IstioTopologyEdge {
  source: string;
  destination: string;
  weight?: number;
}

export interface IstioMetricsTimeseries {
  query: string;
  timeseries: { timestamp: number; value: number }[];
}

export interface IstioLatency {
  p50: IstioMetricsTimeseries;
  p95: IstioMetricsTimeseries;
  p99: IstioMetricsTimeseries;
}

// -- Linkerd 2.x Service Mesh (Phase 20) --

export interface LinkerdControlPlaneComponent {
  name: string;
  ready: boolean;
  version?: string;
}

export interface LinkerdStatus {
  installed: boolean;
  components: LinkerdControlPlaneComponent[];
}

export interface LinkerdServerAuthorization {
  name: string;
  namespace: string;
  server: string;
  clients: string[];
}

export interface LinkerdAuthorizationPolicy {
  name: string;
  namespace: string;
  targetRef: { kind: string; name: string };
  requiredAuthenticationRefs: Array<{ name: string; kind: string }>;
}

export interface LinkerdServiceProfileRoute {
  name: string;
  condition?: { pathRegex?: string; method?: string };
  isRetryable: boolean;
  timeout?: string;
}

export interface LinkerdRetryBudget {
  retryRatio: number;
  minRetriesPerSecond: number;
  ttl: string;
}

export interface LinkerdServiceProfile {
  name: string;
  namespace: string;
  routes: LinkerdServiceProfileRoute[];
  retryBudget?: LinkerdRetryBudget;
}

export interface LinkerdTopologyEdge {
  source: string;
  destination: string;
  namespace: string;
  rps?: number;
}

/** Reuse IstioMetricsTimeseries shape for Linkerd metrics (same Prometheus response structure). */
export type LinkerdMetricsTimeseries = IstioMetricsTimeseries;

/** Reuse latency percentile structure for Linkerd. */
export interface LinkerdLatency {
  p50: LinkerdMetricsTimeseries;
  p95: LinkerdMetricsTimeseries;
  p99: LinkerdMetricsTimeseries;
}

// -- API Catalog and Lifecycle Management (FARM-E47) --

export type ApiSpecFormat = "openapi" | "asyncapi";
export type ApiSpecStatus = "active" | "deprecated" | "sunset";

export interface ApiSpec {
  id: string;
  componentId: string;
  name: string;
  format: ApiSpecFormat;
  version: string;
  spec: string; // raw YAML/JSON content
  status: ApiSpecStatus;
  deprecatedAt: string | null;
  sunsetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConsumer {
  id: string;
  apiSpecId: string;
  consumerComponentId: string | null;
  consumerTeamId: string | null;
  addedAt: string;
}

export interface SpecDiffEntry {
  type: "added" | "removed" | "modified";
  breaking: boolean;
  path: string;
  detail: string;
}

export interface SpecDiffResult {
  totalChanges: number;
  breakingChanges: number;
  entries: SpecDiffEntry[];
}

export interface CreateApiSpecDto {
  name: string;
  format: ApiSpecFormat;
  version: string;
  spec: string;
}

export interface UpdateApiSpecDto {
  status?: ApiSpecStatus;
  sunsetAt?: string;
  deprecatedAt?: string;
}

export interface AddConsumerDto {
  consumerComponentId?: string;
  consumerTeamId?: string;
}

// -- Gateway Routes (FARM-E48) --

export type GatewayType = "kong" | "aws";

/**
 * Health status for a gateway route endpoint.
 * Renamed RouteHealthStatus to avoid collision with the NestJS HealthStatus interface above.
 */
export type RouteHealthStatus = "up" | "degraded" | "down";

export interface GatewayRoute {
  id: string;
  externalId: string;
  name: string;
  paths: string[];
  methods: string[];
  tags: string[];
  gatewayType: GatewayType;
  componentId: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHealthCheck {
  id: string;
  url: string;
  status: RouteHealthStatus;
  latencyMs: number | null;
  apiSpecId: string | null;
  checkedAt: string;
  createdAt: string;
}

// -- Kyverno Policy Reports (FARM-E40) --

/** A Kyverno PolicyReport (or ClusterPolicyReport) result returned by the backend. */
export interface KyvernoPolicyReportResult {
  name: string;
  namespace?: string;
  resourceId: string;
  resourceType: string;
  /** Farm component ID if the k8s resource carries a farm component label. */
  linkedComponentId?: string;
  results: Array<{
    policy: string;
    rule: string;
    status: 'pass' | 'fail' | 'warn' | 'error' | 'skip';
    message: string;
    category?: string;
    severity?: string;
  }>;
}

// -- SLO Management (FARM-E51) --

export type SloMetricType = "availability" | "latency" | "error_rate";
export type SloWindow = "7d" | "30d" | "90d";
export type SloBudgetStatus = "healthy" | "warning" | "critical" | "exhausted";

export interface Slo {
  id: string;
  name: string;
  description: string | null;
  targetPercent: number;
  metricType: SloMetricType;
  window: SloWindow;
  componentId: string | null;
  organizationId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SloBudgetResponse {
  sloId: string;
  name: string;
  targetPercent: number;
  currentPercent: number;
  budgetTotal: number;
  budgetConsumed: number;
  budgetRemaining: number;
  burnRate: number;
  status: SloBudgetStatus;
  windowStart: string;
  windowEnd: string;
}

export interface CreateSloDto {
  name: string;
  description?: string;
  targetPercent: number;
  metricType: SloMetricType;
  window: SloWindow;
  componentId?: string;
  enabled?: boolean;
}

export interface UpdateSloDto {
  name?: string;
  description?: string;
  targetPercent?: number;
  metricType?: SloMetricType;
  window?: SloWindow;
  componentId?: string;
  enabled?: boolean;
}

// -- Incident Management (FARM-E52) --

export type IncidentSeverity = "P1" | "P2" | "P3" | "P4";
export type IncidentStatus = "open" | "investigating" | "identified" | "resolved";

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  commanderUserId: string | null;
  organizationId: string | null;
  resolvedAt: string | null;
  affectedComponents?: CatalogComponent[];
  affectedEnvironments?: Environment[];
  updates?: IncidentUpdateEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentUpdateEntry {
  id: string;
  incidentId: string;
  authorId: string | null;
  message: string;
  previousStatus: IncidentStatus | null;
  newStatus: IncidentStatus | null;
  createdAt: string;
}

export interface PostMortemActionItem {
  title: string;
  assignee?: string;
  done: boolean;
}

export interface PostMortem {
  id: string;
  incidentId: string;
  rootCause: string;
  contributingFactors: string[] | null;
  actionItems: PostMortemActionItem[] | null;
  body: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentDto {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  commanderUserId?: string;
  affectedComponentIds?: string[];
  affectedEnvironmentIds?: string[];
}

export interface UpdateIncidentDto {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  commanderUserId?: string;
  affectedComponentIds?: string[];
  affectedEnvironmentIds?: string[];
}

export interface UpdateIncidentStatusDto {
  status: IncidentStatus;
  message?: string;
}

export interface CreateIncidentUpdateDto {
  message: string;
}

export interface CreatePostMortemDto {
  incidentId: string;
  rootCause: string;
  contributingFactors?: string[];
  actionItems?: PostMortemActionItem[];
  body?: string;
}

export interface UpdatePostMortemDto {
  rootCause?: string;
  contributingFactors?: string[];
  actionItems?: PostMortemActionItem[];
  body?: string;
}

// -- Custom Dashboard Builder (FARM-E53) --

export type DashboardVisibility = "private" | "workspace";
export type WidgetType =
  | "metric_graph"
  | "component_health"
  | "deployment_feed"
  | "queue_status"
  | "slo_gauge"
  | "alert_summary"
  | "team_activity"
  | "uptime_chart";

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  visibility: DashboardVisibility;
  organizationId: string | null;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  visibility?: DashboardVisibility;
}

export interface UpdateDashboardDto {
  name?: string;
  description?: string;
  visibility?: DashboardVisibility;
}

export interface CreateWidgetDto {
  type: WidgetType;
  title: string;
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
  config?: Record<string, unknown>;
}

export interface UpdateWidgetDto {
  title?: string;
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
  config?: Record<string, unknown>;
}

export interface UpdateLayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UpdateLayoutDto {
  widgets: UpdateLayoutItem[];
}

// -- Service Templates (FARM-E57) --

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  default?: string;
  required: boolean;
  pattern?: string;
  // Phase 28: extended type system
  type?: TemplateVariableType;
  options?: string[];
  placeholder?: string;
  dependsOn?: TemplateVariableDependsOn;
}

export type TemplateVariableType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "multiselect";

export interface TemplateVariableDependsOn {
  /** Key of another variable that controls visibility. */
  field: string;
  /** Value of that field that triggers the action. */
  equals: string;
  /** Whether to show or hide this field when the condition is met. */
  action: "show" | "hide";
}

export interface DryRunResultDto {
  valid: boolean;
  errors: string[];
  preview: string;
}

export interface DryRunRequestDto {
  variables?: Record<string, string>;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description: string | null;
  language: string;
  framework: string;
  tags: string[] | null;
  repositoryUrl: string;
  variables: TemplateVariable[] | null;
  isBuiltIn: boolean;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScaffoldRequestStatus = "pending" | "in_progress" | "completed" | "failed";

export interface ScaffoldRequest {
  id: string;
  templateId: string;
  templateName: string;
  targetRepository: string;
  variables: Record<string, string> | null;
  status: ScaffoldRequestStatus;
  statusMessage: string | null;
  requestedBy: string;
  dryRun: boolean;
  renderedFiles: string[] | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceTemplateDto {
  name: string;
  description?: string;
  language: string;
  framework: string;
  tags?: string[];
  repositoryUrl: string;
  variables?: TemplateVariable[];
  organizationId?: string;
}

export interface UpdateServiceTemplateDto {
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  tags?: string[];
  repositoryUrl?: string;
  variables?: TemplateVariable[];
}

export interface CreateScaffoldRequestDto {
  targetRepository: string;
  variables?: Record<string, string>;
  dryRun?: boolean;
}

// -- Environment Requests (FARM-E58) --

export type EnvironmentRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "provisioning"
  | "active"
  | "expired";

export type EnvironmentRequestType = "ephemeral" | "persistent";
export type EnvironmentTier = "small" | "medium" | "large";

export interface EnvironmentRequest {
  id: string;
  name: string;
  description: string | null;
  requestedBy: string;
  type: EnvironmentRequestType;
  tier: EnvironmentTier;
  ttlHours: number;
  status: EnvironmentRequestStatus;
  statusMessage: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  provisionedAt: string | null;
  expiresAt: string | null;
  componentId: string | null;
  environmentId: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentRequestDto {
  name: string;
  description?: string;
  type: EnvironmentRequestType;
  tier: EnvironmentTier;
  ttlHours?: number;
  componentId?: string;
  organizationId?: string;
}

export interface UpdateEnvironmentRequestDto {
  name?: string;
  description?: string;
  ttlHours?: number;
}

export interface ReviewEnvironmentRequestDto {
  comment?: string;
}

/** A Harbor replication policy (rule). */
export interface HarborReplicationPolicy {
  id: number;
  name: string;
  srcRegistry: string;
  destRegistry: string;
  filters: string[];
  triggerType: string;
  enabled: boolean;
  lastExecutionStatus: string | null;
}

// -- Flux GitOps (FARM-E61 / Phase 18) --

export interface FluxControllerInfo {
  name: string;
  version: string;
  ready: boolean;
}

export interface FluxInstallStatus {
  installed: boolean;
  controllers: FluxControllerInfo[];
}

export interface FluxKustomization {
  name: string;
  namespace: string;
  path: string;
  ready: boolean;
  suspended: boolean;
  lastAppliedRevision: string | null;
  sourceRef: string | null;
  readyConditionMessage: string | null;
}

export interface FluxHelmRelease {
  name: string;
  namespace: string;
  chartName: string;
  chartVersion: string | null;
  ready: boolean;
  suspended: boolean;
  lastAppliedRevision: string | null;
  readyConditionMessage: string | null;
}

export interface FluxSource {
  kind: string;
  name: string;
  namespace: string;
  url: string;
  branch: string | null;
  lastFetchedCommit: string | null;
  ready: boolean;
  readyConditionMessage: string | null;
}

export interface FluxBinding {
  id: string;
  resourceKind: "Kustomization" | "HelmRelease";
  resourceName: string;
  resourceNamespace: string;
  componentId: string;
  organizationId?: string;
  boundAt: string;
}

export interface CreateFluxBindingDto {
  resourceKind: "Kustomization" | "HelmRelease";
  resourceName: string;
  resourceNamespace: string;
  componentId: string;
  organizationId?: string;
}

// -- KEDA Autoscaling (FARM-E62 / Phase 18) --

export interface KedaInstallStatus {
  installed: boolean;
  version: string;
}

export interface KedaScaledObjectTrigger {
  type: string;
  metadata: Record<string, string>;
}

export interface KedaScaledObject {
  name: string;
  namespace: string;
  targetDeployment: string | null;
  targetKind: string | null;
  minReplicaCount: number;
  maxReplicaCount: number;
  ready: boolean;
  active: boolean;
  paused: boolean;
  currentReplicas: number;
  desiredReplicas: number;
  scalerType: string;
  triggers: KedaScaledObjectTrigger[];
}

export interface KedaScaledJob {
  name: string;
  namespace: string;
  jobTemplateName: string | null;
  minReplicaCount: number;
  maxReplicaCount: number;
  ready: boolean;
}

export interface KedaBinding {
  id: string;
  scaledObjectName: string;
  scaledObjectNamespace: string;
  componentId: string;
  organizationId?: string;
  boundAt: string;
}

export interface CreateKedaBindingDto {
  scaledObjectName: string;
  scaledObjectNamespace: string;
  componentId: string;
  organizationId?: string;
}

// -- Phase 25 --

export interface FeatureAvailabilityRaw {
  kubernetes: { available: boolean };
  cost: { available: boolean };
  registry: { available: boolean };
  helm: { available: boolean };
  istio: { available: boolean };
  linkerd: { available: boolean };
}

export interface FeatureAvailability {
  kubernetes: boolean;
  cost: boolean;
  registry: boolean;
  helm: boolean;
  istio: boolean;
  linkerd: boolean;
  allConfigured: boolean;
}

export interface QuickSearchResult {
  type: string;
  id: string;
  name: string;
  description?: string;
  url: string;
}

export interface SetupChecklistItem {
  key: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  dismissed: boolean;
}

// -- Gatekeeper types (Phase 21) --

export interface GatekeeperConstraintTemplate {
  name: string;
  group: string;
  enforcementAction: 'deny' | 'warn' | 'dryrun';
  description?: string;
  violationCount: number;
}

export interface GatekeeperViolation {
  kind: string;
  name: string;
  namespace?: string;
  message: string;
  constraint: string;
  enforcementAction: 'deny' | 'warn' | 'dryrun';
}

// -- OPA types (Phase 21) --

export interface OpaStatus {
  reachable: boolean;
  url: string;
}

export interface OpaEvaluateRequest {
  policyPath: string;
  input: Record<string, unknown>;
  componentId?: string;
}

export interface OpaEvaluateResult {
  policyPath: string;
  allowed: boolean;
  violations: string[];
}

export interface OpaStoredResult {
  id: string;
  componentId: string;
  policyPath: string;
  allowed: boolean;
  violations: string[];
  evaluatedAt: string;
  createdAt: string;
}

// -- IaC types (FARM-E70) --

export type IacRunType = "plan" | "apply";
export type IacRunStatus = "succeeded" | "failed" | "cancelled";

export interface IacResourceChanges {
  add: number;
  change: number;
  destroy: number;
}

export interface IacRun {
  id: string;
  stackId: string;
  type: IacRunType;
  status: IacRunStatus;
  environment: string;
  provider: string | null;
  resourceChanges: IacResourceChanges | null;
  triggeredBy: string | null;
  pipelineUrl: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IacStackSummary {
  stackId: string;
  name: string;
  lastRunStatus: IacRunStatus | null;
  lastRunAt: string | null;
  lastRunType: IacRunType | null;
  resourceChanges: IacResourceChanges | null;
  autoImported: boolean;
  provider: string;
  externalToolUrl: string | null;
}

export interface IacDashboard {
  totalStacks: number;
  failedLastRun: number;
  environments: string[];
  stacksByEnvironment: Record<string, IacStackSummary[]>;
}

export interface IacModuleDrift {
  id: string;
  stackPath: string;
  moduleName: string;
  sourceUrl: string;
  currentRef: string;
  latestRef: string;
  versionsBehind: number;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IacStackRunsResponse {
  data: IacRun[];
  total: number;
}

// ---------------------------------------------------------------------------
// IaC Stack read endpoints (FARM-S277)
// ---------------------------------------------------------------------------

export interface IacLastRunSummary {
  id: string;
  status: IacRunStatus;
  type: IacRunType;
  startedAt: string | null;
}

export interface IacStack {
  id: string;
  name: string;
  environment: string;
  provider: string;
  repositoryUrl: string | null;
  basePath: string | null;
  externalToolUrl: string | null;
  componentId: string | null;
  autoImported: boolean;
  lastRun: IacLastRunSummary | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// IaC Module Catalog (FARM-E68)
// ---------------------------------------------------------------------------

export type IacProvider =
  | "aws"
  | "gcp"
  | "azure"
  | "kubernetes"
  | "mongodb"
  | "postgres"
  | "mysql"
  | "github"
  | "cloudflare"
  | "generic";

export type IacEngine = "terraform" | "opentofu" | "pulumi";

export interface IacModuleVariable {
  name: string;
  type: string | null;
  description: string | null;
  default: string | null;
  required: boolean;
  validation: { condition: string; errorMessage: string } | null;
}

export interface IacModuleOutput {
  name: string;
  description: string | null;
  value: string | null;
}

export interface IacModuleVersion {
  id: string;
  version: string;
  isLatest: boolean;
  variablesMeta: IacModuleVariable[];
  outputsMeta: IacModuleOutput[];
  createdAt: string;
  updatedAt: string;
}

export interface IacModule {
  id: string;
  name: string;
  provider: IacProvider;
  engine: IacEngine | null;
  sourceRepoUrl: string;
  description: string | null;
  latestVersion: string | null;
  componentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type IacModulesResponse = IacModule[];

export interface IacResourceNode {
  address: string;
  resourceType: string;
  resourceName: string;
  provider: string;
}

export interface IacResourceEdge {
  source: string;
  target: string;
}

export interface IacResourceMap {
  resources: IacResourceNode[];
  dependencies: IacResourceEdge[];
}

// -- Advanced Search (FARM-S318) --

export interface AdvancedSearchHit {
  id: string;
  type: string;
  name: string;
  description?: string;
  namespace?: string;
  tags?: string[];
  url: string;
  score: number;
  highlights?: {
    name?: string[];
    description?: string[];
    tags?: string[];
  };
}

export interface FacetBucket {
  key: string;
  count: number;
}

export interface AdvancedSearchResult {
  hits: AdvancedSearchHit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: {
    types: FacetBucket[];
    namespaces: FacetBucket[];
    tags: FacetBucket[];
  };
  source: 'elasticsearch' | 'database';
}
