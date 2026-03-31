import type {
  AddConsumerDto,
  AlertingRule,
  ApiConsumer,
  ApiSpec,
  ArgoCDApplication,
  CatalogComponent,
  CircleCIPipeline,
  ComplianceSummary,
  CreateApiSpecDto,
  Deployment,
  DeploymentMatrixRow,
  DocumentationEntry,
  DocumentationSearchResult,
  DocumentationTreeNode,
  Environment,
  ErrorResponse,
  HealthStatus,
  HelmRelease,
  HelmSyncResult,
  IntegrationCredential,
  IstioAuthorizationPolicy,
  IstioLatency,
  IstioMetricsTimeseries,
  IstioPeerAuthentication,
  IstioTopologyEdge,
  IstioVirtualService,
  JaegerTrace,
  JaegerTracesResponse,
  JenkinsJob,
  JobInfo,
  KeycloakCredential,
  KubernetesCRD,
  KubernetesRollout,
  KyvernoPolicyReportResult,
  LokiLabelsResponse,
  LokiLogsResponse,
  LoginRequest,
  LoginResponse,
  MemberResponse,
  ObservabilitySummary,
  Organization,
  OrgInvitation,
  PaginatedResponse,
  PaginationQuery,
  Pipeline,
  PipelineRun,
  PipelineStage,
  PluginMetadata,
  PrometheusRangeResponse,
  QueueInfo,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResourceViolation,
  SpecDiffResult,
  TagPolicy,
  Team,
  TravisBuild,
  UpdateApiSpecDto,
  User,
  // Gateway Routes (FARM-E48)
  GatewayRoute,
  ApiHealthCheck,
  // SLO Management (FARM-E51)
  Slo,
  SloBudgetResponse,
  CreateSloDto,
  UpdateSloDto,
  // Incident Management (FARM-E52)
  Incident,
  IncidentUpdateEntry,
  PostMortem,
  CreateIncidentDto,
  UpdateIncidentDto,
  UpdateIncidentStatusDto,
  CreateIncidentUpdateDto,
  CreatePostMortemDto,
  UpdatePostMortemDto,
  // Custom Dashboard Builder (FARM-E53)
  Dashboard,
  DashboardWidget,
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UpdateLayoutDto,
  // Service Templates (FARM-E57)
  ServiceTemplate,
  ScaffoldRequest,
  CreateServiceTemplateDto,
  UpdateServiceTemplateDto,
  CreateScaffoldRequestDto,
  // Environment Requests (FARM-E58)
  EnvironmentRequest,
  CreateEnvironmentRequestDto,
  UpdateEnvironmentRequestDto,
  ReviewEnvironmentRequestDto,
  // Operators & Runtime (Phase 16)
  OperatorInfo,
  CustomResourceInstance,
  OperatorBinding,
  NodeRuntimeInfo,
  CrioStorageMetrics,
} from "@/types/api";

const API_BASE = "/api";

// -- Token storage --

let accessToken: string | null = null;
let refreshToken: string | null = null;
let currentUsername: string | null = null;

export function setTokens(token: string, refresh: string, username: string) {
  accessToken = token;
  refreshToken = refresh;
  currentUsername = username;

  if (typeof window !== "undefined") {
    sessionStorage.setItem("farm_token", token);
    sessionStorage.setItem("farm_refresh", refresh);
    sessionStorage.setItem("farm_username", username);
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  currentUsername = null;

  if (typeof window !== "undefined") {
    sessionStorage.removeItem("farm_token");
    sessionStorage.removeItem("farm_refresh");
    sessionStorage.removeItem("farm_username");
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    accessToken = sessionStorage.getItem("farm_token");
  }
  return accessToken;
}

function getRefreshData(): { username: string; refreshToken: string } | null {
  const rt = refreshToken ?? sessionStorage.getItem("farm_refresh");
  const un = currentUsername ?? sessionStorage.getItem("farm_username");
  if (!rt || !un) return null;
  return { username: un, refreshToken: rt };
}

// -- Error class --

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ErrorResponse,
  ) {
    super(Array.isArray(body.message) ? body.message.join(", ") : body.message);
    this.name = "ApiError";
  }
}

// -- Core fetch wrapper --

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const data = getRefreshData();
  if (!data) return false;

  try {
    const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) return false;

    const result = (await res.json()) as RefreshTokenResponse;
    setTokens(result.token, result.refreshToken, data.username);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // FARM-E25: Inject X-Organization-Id for multi-tenant request scoping.
  //
  // OrganizationProvider persists the selected org's raw id string under
  // "farm_current_org" in sessionStorage (NOT JSON — just the id string).
  //
  // We intentionally avoid importing ORG_STORAGE_KEY from
  // organization-context to prevent a circular dependency:
  //   api-client → organization-context → api-client
  //
  // The header is optional: when absent the backend falls back to
  // non-scoped behaviour, so API calls are never blocked.
  if (typeof window !== "undefined") {
    const orgId = sessionStorage.getItem("farm_current_org");
    if (orgId) {
      headers["X-Organization-Id"] = orgId;
    }
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Automatic token refresh on 401
  if (res.status === 401 && getRefreshData()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await (refreshPromise ?? Promise.resolve(false));

    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, {
        statusCode: 401,
        timestamp: new Date().toISOString(),
        path,
        message: "Session expired",
      });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json()) as T;

  if (!res.ok) {
    throw new ApiError(res.status, body as unknown as ErrorResponse);
  }

  return body;
}

// -- Query string helper --

function toQueryString(params: Record<string, unknown> | object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return "";
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `?${qs}`;
}

// -- Auth API --

export const auth = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  refresh(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return request("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getUsers(): Promise<User[]> {
    return request("/v1/auth/users");
  },

  /**
   * Redirect the browser to the Keycloak OIDC login flow for an organisation.
   * This is a full-page navigation (not a fetch) — the backend handles the
   * OIDC redirect and issues a JWT on callback.
   */
  keycloakLogin(orgId: string): void {
    if (typeof window !== "undefined") {
      window.location.href = `/api/v1/auth/keycloak?orgId=${encodeURIComponent(orgId)}`;
    }
  },

  /**
   * Enqueue a Keycloak group-sync job for the given organisation (admin only).
   * Returns `{ queued: true }` when the job is accepted.
   */
  keycloakSync(orgId: string): Promise<{ queued: boolean }> {
    return request<{ queued: boolean }>(`/v1/auth/keycloak/sync/${encodeURIComponent(orgId)}`, {
      method: "POST",
    });
  },
};

// -- Catalog API --

export const catalog = {
  listComponents(
    query?: PaginationQuery & { kindGroup?: string },
  ): Promise<PaginatedResponse<CatalogComponent>> {
    return request(`/v1/catalog/components${toQueryString(query ?? {})}`);
  },

  getComponent(id: string): Promise<CatalogComponent> {
    return request(`/v1/catalog/components/${id}`);
  },

  createComponent(data: Partial<CatalogComponent>): Promise<CatalogComponent> {
    return request("/v1/catalog/components", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateComponent(id: string, data: Partial<CatalogComponent>): Promise<CatalogComponent> {
    return request(`/v1/catalog/components/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteComponent(id: string): Promise<void> {
    return request(`/v1/catalog/components/${id}`, { method: "DELETE" });
  },

  registerYaml(yaml: string): Promise<CatalogComponent> {
    return request("/v1/catalog/register-yaml", {
      method: "POST",
      body: JSON.stringify({ yaml }),
    });
  },

  discoverFromLocation(url: string): Promise<{ message: string; jobId?: string }> {
    return request("/v1/catalog/locations", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },
};

// -- Environments API --

export const environments = {
  list(): Promise<PaginatedResponse<Environment>> {
    return request("/v1/environments");
  },

  get(id: string): Promise<Environment> {
    return request(`/v1/environments/${id}`);
  },

  create(data: Partial<Environment>): Promise<Environment> {
    return request("/v1/environments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// -- Deployments API --

export const deployments = {
  list(
    query?: PaginationQuery & { componentId?: string; environmentId?: string; status?: string },
  ): Promise<PaginatedResponse<Deployment>> {
    return request(`/v1/deployments${toQueryString(query ?? {})}`);
  },

  get(id: string): Promise<Deployment> {
    return request(`/v1/deployments/${id}`);
  },

  create(data: Partial<Deployment>): Promise<Deployment> {
    return request("/v1/deployments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Deployment>): Promise<Deployment> {
    return request(`/v1/deployments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  matrix(query?: { kindGroup?: string; lifecycle?: string; owner?: string }): Promise<DeploymentMatrixRow[]> {
    return request(`/v1/deployments/matrix${toQueryString(query ?? {})}`);
  },

  latest(componentId: string): Promise<Deployment[]> {
    return request(`/v1/deployments/latest?componentId=${encodeURIComponent(componentId)}`);
  },
};

// -- Teams API --

export const teams = {
  list(): Promise<PaginatedResponse<Team>> {
    return request("/v1/teams");
  },

  get(id: string): Promise<Team> {
    return request(`/v1/teams/${id}`);
  },

  create(data: Partial<Team>): Promise<Team> {
    return request("/v1/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Team>): Promise<Team> {
    return request(`/v1/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/v1/teams/${id}`, { method: "DELETE" });
  },

  getMembers(id: string): Promise<User[]> {
    return request(`/v1/teams/${id}/members`);
  },

  addMember(teamId: string, userId: string): Promise<void> {
    return request(`/v1/teams/${teamId}/members/${userId}`, { method: "POST" });
  },

  removeMember(teamId: string, userId: string): Promise<void> {
    return request(`/v1/teams/${teamId}/members/${userId}`, { method: "DELETE" });
  },

  getComponents(id: string): Promise<CatalogComponent[]> {
    return request(`/v1/teams/${id}/components`);
  },
};

// -- Queues API --

export const queues = {
  list(): Promise<QueueInfo[]> {
    return request("/v1/queues");
  },

  get(name: string): Promise<QueueInfo> {
    return request(`/v1/queues/${encodeURIComponent(name)}`);
  },

  listJobs(
    queueName: string,
    query?: { status?: string; start?: number; limit?: number },
  ): Promise<JobInfo[]> {
    return request(
      `/v1/queues/${encodeURIComponent(queueName)}/jobs${toQueryString(query ?? {})}`,
    );
  },

  getJob(queueName: string, jobId: string): Promise<JobInfo> {
    return request(
      `/v1/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}`,
    );
  },

  retryJob(queueName: string, jobId: string): Promise<void> {
    return request(
      `/v1/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}/retry`,
      { method: "POST" },
    );
  },
};

// -- Documentation API --

export const docs = {
  list(
    query?: PaginationQuery & { componentId?: string },
  ): Promise<PaginatedResponse<DocumentationEntry>> {
    return request(`/v1/docs${toQueryString(query ?? {})}`);
  },

  get(id: string): Promise<DocumentationEntry> {
    return request(`/v1/docs/${id}`);
  },

  getContent(id: string): Promise<string> {
    return request(`/v1/docs/${id}/content`);
  },

  getRendered(id: string): Promise<string> {
    return request(`/v1/docs/${id}/rendered`);
  },

  search(q: string, componentId?: string): Promise<DocumentationSearchResult[]> {
    const params: Record<string, string> = { q };
    if (componentId) params.componentId = componentId;
    return request(`/v1/docs/search${toQueryString(params)}`);
  },

  tree(componentId: string): Promise<DocumentationTreeNode[]> {
    return request(`/v1/docs/tree?componentId=${encodeURIComponent(componentId)}`);
  },

  create(data: Partial<DocumentationEntry>): Promise<DocumentationEntry> {
    return request("/v1/docs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<DocumentationEntry>): Promise<DocumentationEntry> {
    return request(`/v1/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/v1/docs/${id}`, { method: "DELETE" });
  },
};

// -- Health API --

export const health = {
  check(): Promise<HealthStatus> {
    return request("/health");
  },
};

// -- Organizations API --

export const organizations = {
  list(): Promise<Organization[]> {
    return request<PaginatedResponse<Organization>>("/v1/organizations").then(
      (r) => r.data,
    );
  },

  create(data: { name: string; description?: string }): Promise<Organization> {
    return request("/v1/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get(id: string): Promise<Organization> {
    return request(`/v1/organizations/${id}`);
  },

  update(
    id: string,
    data: Partial<{ name: string; description: string }>,
  ): Promise<Organization> {
    return request(`/v1/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/v1/organizations/${id}`, { method: "DELETE" });
  },

  /**
   * Member sub-resource methods for /api/v1/organizations/:id/members.
   * All methods require the caller to supply the parent org id explicitly so
   * the namespace remains stateless and easy to mock in tests.
   */
  members: {
    list(
      orgId: string,
      params?: { skip?: number; take?: number },
    ): Promise<PaginatedResponse<MemberResponse>> {
      return request(
        `/v1/organizations/${orgId}/members${toQueryString(params ?? {})}`,
      );
    },

    add(
      orgId: string,
      dto: { username: string; role?: string },
    ): Promise<MemberResponse> {
      return request(`/v1/organizations/${orgId}/members`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    updateRole(
      orgId: string,
      userId: string,
      dto: { role: string },
    ): Promise<MemberResponse> {
      return request(`/v1/organizations/${orgId}/members/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      });
    },

    remove(orgId: string, userId: string): Promise<void> {
      return request(`/v1/organizations/${orgId}/members/${userId}`, {
        method: "DELETE",
      });
    },
  },

  /**
   * Invitation sub-resource methods for /api/v1/organizations/:id/invitations.
   */
  invitations: {
    list(orgId: string): Promise<OrgInvitation[]> {
      return request(`/v1/organizations/${orgId}/invitations`);
    },

    create(orgId: string, dto: { email: string; role?: string }): Promise<OrgInvitation> {
      return request(`/v1/organizations/${orgId}/invitations`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    cancel(orgId: string, invitationId: string): Promise<void> {
      return request(`/v1/organizations/${orgId}/invitations/${invitationId}`, {
        method: "DELETE",
      });
    },
  },
};

// -- Standalone invitation acceptance --

export const invitations = {
  accept(token: string): Promise<MemberResponse> {
    return request(`/v1/invitations/${token}/accept`, { method: "POST" });
  },
};

// -- Observability API --

export const observability = {
  summary(): Promise<ObservabilitySummary> {
    return request("/v1/observability/summary");
  },

  queryRange(
    query: string,
    start: number,
    end: number,
    step: number,
  ): Promise<PrometheusRangeResponse> {
    return request(
      `/v1/observability/metrics/query-range${toQueryString({ query, start, end, step })}`,
    );
  },

  queryInstant(query: string, time?: number): Promise<PrometheusRangeResponse> {
    return request(
      `/v1/observability/metrics/query${toQueryString({ query, ...(time !== undefined ? { time } : {}) })}`,
    );
  },

  getTraces(params: {
    service?: string;
    limit?: number;
    lookback?: string;
  }): Promise<JaegerTracesResponse> {
    return request(`/v1/observability/traces${toQueryString(params)}`);
  },

  getTraceServices(): Promise<{ data: string[] }> {
    return request("/v1/observability/traces/services");
  },

  getTrace(traceId: string): Promise<{ data: JaegerTrace[] }> {
    return request(`/v1/observability/traces/${encodeURIComponent(traceId)}`);
  },

  getLogs(params: {
    query?: string;
    start?: number;
    end?: number;
    limit?: number;
    direction?: "forward" | "backward";
  }): Promise<LokiLogsResponse> {
    return request(`/v1/observability/logs${toQueryString(params)}`);
  },

  getLogLabels(): Promise<LokiLabelsResponse> {
    return request("/v1/observability/logs/labels");
  },
};

// -- Pipeline run types --

export interface RunStats {
  total: number;
  byStatus: Record<string, number>;
  successRate: number;
  avgDurationMs: number | null;
  lastRunAt: string | null;
}

export interface StageDiffEntry {
  stageId: string;
  statusA: string | null;
  statusB: string | null;
  durationMsA: number | null;
  durationMsB: number | null;
  durationDeltaMs: number | null;
  changed: boolean;
}

export interface RunComparison {
  runA: {
    id: string;
    status: string;
    triggeredBy: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationMs: number | null;
  };
  runB: {
    id: string;
    status: string;
    triggeredBy: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationMs: number | null;
  };
  stageDiff: StageDiffEntry[];
}

// -- Pipelines API --

export const pipelines = {
  list(params?: { organizationId?: string }): Promise<Pipeline[]> {
    return request<PaginatedResponse<Pipeline>>(
      `/v1/pipelines${toQueryString(params ?? {})}`,
    ).then((r) => r.data);
  },

  create(data: {
    name: string;
    description?: string;
    stages?: PipelineStage[];
  }): Promise<Pipeline> {
    return request("/v1/pipelines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get(id: string): Promise<Pipeline> {
    return request(`/v1/pipelines/${id}`);
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      stages: PipelineStage[];
    }>,
  ): Promise<Pipeline> {
    return request(`/v1/pipelines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  remove(id: string): Promise<void> {
    return request(`/v1/pipelines/${id}`, { method: "DELETE" });
  },

  trigger(id: string): Promise<PipelineRun> {
    return request(`/v1/pipelines/${id}/trigger`, { method: "POST" });
  },

  listRuns(id: string): Promise<PipelineRun[]> {
    return request(`/v1/pipelines/${id}/runs`);
  },

  getRun(id: string, runId: string): Promise<PipelineRun> {
    return request(`/v1/pipelines/${id}/runs/${runId}`);
  },

  // -- Run lifecycle actions (FARM-E26) --

  approveRun(pipelineId: string, runId: string): Promise<PipelineRun> {
    return request(`/v1/pipelines/${pipelineId}/runs/${runId}/approve`, {
      method: "POST",
    });
  },

  rejectRun(pipelineId: string, runId: string): Promise<PipelineRun> {
    return request(`/v1/pipelines/${pipelineId}/runs/${runId}/reject`, {
      method: "POST",
    });
  },

  cancelRun(pipelineId: string, runId: string): Promise<PipelineRun> {
    return request(`/v1/pipelines/${pipelineId}/runs/${runId}/cancel`, {
      method: "POST",
    });
  },

  // Retrigger is a clearly-named alias for trigger, used in retry UX contexts.
  retrigger(pipelineId: string): Promise<PipelineRun> {
    return request(`/v1/pipelines/${pipelineId}/trigger`, { method: "POST" });
  },

  // -- Run sub-namespace (paginated list, stats, compare) --

  runs: {
    /**
     * List runs for a pipeline with optional pagination and status filtering.
     * Returns a paginated envelope: { data, total, skip, take }.
     */
    list(
      pipelineId: string,
      params?: { skip?: number; take?: number; status?: string },
    ): Promise<{ data: PipelineRun[]; total: number; skip: number; take: number }> {
      return request(
        `/v1/pipelines/${pipelineId}/runs${toQueryString(params ?? {})}`,
      );
    },

    /** Fetch a single run record. */
    get(pipelineId: string, runId: string): Promise<PipelineRun> {
      return request(`/v1/pipelines/${pipelineId}/runs/${runId}`);
    },

    /** Aggregate stats for all runs of a pipeline. */
    stats(pipelineId: string): Promise<RunStats> {
      return request(`/v1/pipelines/${pipelineId}/runs/stats`);
    },

    /** Compare two runs side-by-side with a per-stage diff. */
    compare(
      pipelineId: string,
      runIdA: string,
      runIdB: string,
    ): Promise<RunComparison> {
      return request(
        `/v1/pipelines/${pipelineId}/runs/compare${toQueryString({ a: runIdA, b: runIdB })}`,
      );
    },
  },
};

// -- Alerting Rules API --

export const alertingRules = {
  list(params?: {
    componentId?: string;
    severity?: string;
    organizationId?: string;
  }): Promise<AlertingRule[]> {
    return request<PaginatedResponse<AlertingRule>>(
      `/v1/alerting-rules${toQueryString(params ?? {})}`,
    ).then((r) => r.data);
  },

  create(data: Omit<AlertingRule, "id" | "createdAt" | "updatedAt">): Promise<AlertingRule> {
    return request("/v1/alerting-rules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get(id: string): Promise<AlertingRule> {
    return request(`/v1/alerting-rules/${id}`);
  },

  update(id: string, data: Partial<AlertingRule>): Promise<AlertingRule> {
    return request(`/v1/alerting-rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  remove(id: string): Promise<void> {
    return request(`/v1/alerting-rules/${id}`, { method: "DELETE" });
  },
};

// -- Plugins API --

export const plugins = {
  list(): Promise<PluginMetadata[]> {
    return request("/v1/plugins");
  },

  reload(): Promise<{ scanned: number }> {
    return request("/v1/plugins/reload", { method: "POST" });
  },
};

// ─── Analytics types ──────────────────────────────────────────────────────────

export interface CatalogAnalytics {
  ownershipCoverage: {
    total: number;
    withOwner: number;
    withoutOwner: number;
    coveragePercent: number;
  };
  lifecycleDistribution: { lifecycle: string; count: number }[];
  kindDistribution: { kind: string; count: number }[];
  unownedComponents: { id: string; name: string; kind: string }[];
}

export interface DoraAnalytics {
  periodDays: number;
  deploymentFrequency: { deploymentsPerDay: number; total: number; periodDays: number };
  changeFailureRate: { rate: number; failed: number; total: number };
  meanTimeToRecovery: { avgHours: number; samples: number };
  leadTimeForChanges: { avgHours: number; samples: number };
}

export interface UsageAnalytics {
  periodDays: number;
  totalAuditEvents: number;
  topComponents: { componentId: string; componentName: string; accessCount: number }[];
  activeUsers: { actorId: string; actorUsername: string; actionCount: number }[];
  actionBreakdown: { action: string; count: number }[];
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analytics = {
  getCatalog(): Promise<CatalogAnalytics> {
    return request<CatalogAnalytics>("/v1/analytics/catalog");
  },

  getDora(
    params?: { days?: number; componentId?: string; environmentId?: string },
  ): Promise<DoraAnalytics> {
    return request<DoraAnalytics>(`/v1/analytics/dora${toQueryString(params ?? {})}`);
  },

  getUsage(params?: { days?: number }): Promise<UsageAnalytics> {
    return request<UsageAnalytics>(`/v1/analytics/usage${toQueryString(params ?? {})}`);
  },

  /**
   * Trigger a CSV download in the browser.
   * Bypasses the `request()` helper so we can handle a binary (Blob) response
   * directly and create a temporary anchor element for the download.
   */
  async exportReport(report: "catalog" | "dora" | "usage", days = 30): Promise<void> {
    const token = getAccessToken();
    // Use the Next.js rewrite proxy so auth cookies / CORS are handled
    // consistently with the rest of the API calls.
    const url = `${API_BASE}/v1/analytics/export?report=${report}&days=${days}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Export failed: ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `farm-${report}-analytics.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },
};

// -- Helm API (FARM-E36) --

export const helm = {
  /**
   * List Helm releases discovered from the cluster.
   * Optionally filtered by Kubernetes namespace.
   */
  listReleases(namespace?: string): Promise<HelmRelease[]> {
    return request<HelmRelease[]>(
      `/v1/helm/releases${toQueryString(namespace ? { namespace } : {})}`,
    );
  },

  /**
   * Trigger a sync of Helm releases from the cluster.
   * Returns a count of synced releases and any errors encountered.
   */
  syncReleases(): Promise<HelmSyncResult> {
    return request<HelmSyncResult>("/v1/helm/releases/sync", { method: "POST" });
  },
};

// -- Kubernetes API (FARM-E37) --

export const kubernetes = {
  /**
   * List Custom Resource Definitions discovered in the cluster.
   * Optionally filtered by API group.
   */
  listCRDs(group?: string): Promise<KubernetesCRD[]> {
    return request<KubernetesCRD[]>(
      group ? `/v1/kubernetes/crds/${encodeURIComponent(group)}` : "/v1/kubernetes/crds",
    );
  },

  /**
   * List Argo Rollout resources from the cluster.
   * Optionally filtered by namespace and/or component ID.
   */
  listRollouts(params?: {
    namespace?: string;
    componentId?: string;
  }): Promise<KubernetesRollout[]> {
    return request<KubernetesRollout[]>(
      `/v1/kubernetes/rollouts${toQueryString(params ?? {})}`,
    );
  },

  /** List OLM-managed operators discovered in the cluster. */
  listOperators(): Promise<OperatorInfo[]> {
    return request<OperatorInfo[]>("/v1/kubernetes/operators");
  },

  /** Get a single operator by name. */
  getOperator(name: string): Promise<OperatorInfo | null> {
    return request<OperatorInfo | null>(
      `/v1/kubernetes/operators/${encodeURIComponent(name)}`,
    );
  },

  /** List custom resource instances managed by a specific operator. */
  listOperatorCustomResources(
    operatorName: string,
  ): Promise<CustomResourceInstance[]> {
    return request<CustomResourceInstance[]>(
      `/v1/kubernetes/operators/${encodeURIComponent(operatorName)}/custom-resources`,
    );
  },

  /** List catalog component bindings for an operator. */
  listOperatorBindings(operatorName: string): Promise<OperatorBinding[]> {
    return request<OperatorBinding[]>(
      `/v1/kubernetes/operators/${encodeURIComponent(operatorName)}/bindings`,
    );
  },

  /** Bind an operator to a catalog component. */
  createOperatorBinding(
    operatorName: string,
    data: { operatorNamespace: string; componentId: string },
  ): Promise<OperatorBinding> {
    return request<OperatorBinding>(
      `/v1/kubernetes/operators/${encodeURIComponent(operatorName)}/bindings`,
      { method: "POST", body: JSON.stringify(data) },
    );
  },

  /** Remove an operator-to-component binding. */
  removeOperatorBinding(
    operatorName: string,
    data: { operatorNamespace: string; componentId: string },
  ): Promise<void> {
    return request<void>(
      `/v1/kubernetes/operators/${encodeURIComponent(operatorName)}/bindings`,
      { method: "DELETE", body: JSON.stringify(data) },
    );
  },

  /** List container runtime info for all cluster nodes. */
  listNodeRuntimes(): Promise<NodeRuntimeInfo[]> {
    return request<NodeRuntimeInfo[]>("/v1/kubernetes/nodes/runtimes");
  },

  /** Fetch CRI-O storage metrics for a specific node. */
  getCrioMetrics(nodeName: string): Promise<CrioStorageMetrics> {
    return request<CrioStorageMetrics>(
      `/v1/kubernetes/nodes/${encodeURIComponent(nodeName)}/crio-metrics`,
    );
  },
};

// -- Integration Credentials API (FARM-E35) --

export const integrations = {
  credentials: {
    /** List all stored integration credentials, optionally filtered by type. */
    list(type?: string): Promise<IntegrationCredential[]> {
      return request<IntegrationCredential[]>(
        `/v1/integrations/credentials${toQueryString(type ? { type } : {})}`,
      );
    },

    /** Create a new integration credential. */
    create(dto: Record<string, unknown>): Promise<IntegrationCredential> {
      return request<IntegrationCredential>("/v1/integrations/credentials", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    /** Update an existing integration credential by id. */
    update(id: string, dto: Record<string, unknown>): Promise<IntegrationCredential> {
      return request<IntegrationCredential>(`/v1/integrations/credentials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      });
    },

    /** Delete an integration credential by id. */
    remove(id: string): Promise<void> {
      return request<void>(`/v1/integrations/credentials/${id}`, {
        method: "DELETE",
      });
    },
  },
};

// -- ArgoCD API (FARM-E35) --

export const argocd = {
  /** List ArgoCD applications from the connected ArgoCD instance. */
  listApplications(): Promise<ArgoCDApplication[]> {
    return request<ArgoCDApplication[]>("/v1/argocd/applications");
  },

  /** Trigger an ArgoCD sync for the given application name. */
  syncApplication(name: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      `/v1/argocd/applications/${encodeURIComponent(name)}/sync`,
      { method: "POST" },
    );
  },
};

// -- CircleCI API (FARM-E35) --

export const circleci = {
  /** List CircleCI pipelines, optionally filtered by VCS URL. */
  listPipelines(vcsUrl?: string): Promise<CircleCIPipeline[]> {
    return request<CircleCIPipeline[]>(
      `/v1/circleci/pipelines${toQueryString(vcsUrl ? { vcsUrl } : {})}`,
    );
  },

  /** Trigger a CircleCI pipeline by project slug. */
  triggerPipeline(slug: string): Promise<{ id: string; number: number }> {
    return request<{ id: string; number: number }>(
      `/v1/circleci/pipelines/${encodeURIComponent(slug)}/trigger`,
      { method: "POST" },
    );
  },
};

// -- Jenkins API (FARM-E35) --

export const jenkins = {
  /** List Jenkins jobs from the connected Jenkins instance. */
  listJobs(): Promise<JenkinsJob[]> {
    return request<JenkinsJob[]>("/v1/jenkins/jobs");
  },

  /** Trigger a Jenkins build for the given job name. */
  triggerBuild(name: string): Promise<void> {
    return request<void>(
      `/v1/jenkins/jobs/${encodeURIComponent(name)}/build`,
      { method: "POST" },
    );
  },
};

// -- Travis CI API (FARM-E35) --

export const travisci = {
  /** List Travis CI builds, optionally filtered by repository slug. */
  listBuilds(repoSlug?: string): Promise<TravisBuild[]> {
    return request<TravisBuild[]>(
      `/v1/travisci/builds${toQueryString(repoSlug ? { repoSlug } : {})}`,
    );
  },

  /** Restart a Travis CI build by id. */
  restartBuild(id: number | string): Promise<{ message: string }> {
    return request<{ message: string }>(
      `/v1/travisci/builds/${encodeURIComponent(String(id))}/restart`,
      { method: "POST" },
    );
  },
};

// -- Cloud Provider types (FARM-E38) --

export interface CloudResource {
  provider: "aws" | "gcp" | "azure";
  resourceId: string;
  /** e.g. "ecs-service", "cloud-run", "container-app", "rds", "cloud-sql" */
  resourceType: string;
  name: string;
  region: string;
  tags: Record<string, string>;
  linkedComponentId?: string;
}

export interface CloudCostEntry {
  environment: string;
  component?: string;
  cost: number;
  currency: string;
}

// -- Cloud Provider API (FARM-E38) --

export const cloud = {
  /** List connected cloud providers and their connection status for an org. */
  getProviders(orgId: string): Promise<{ provider: string; connected: boolean; name: string }[]> {
    return request<{ provider: string; connected: boolean; name: string }[]>(
      `/v1/cloud/providers/${encodeURIComponent(orgId)}`,
    );
  },

  /** Discover cloud resources for an org, optionally filtered by provider. */
  discoverResources(orgId: string, provider?: string): Promise<CloudResource[]> {
    return request<CloudResource[]>(
      `/v1/cloud/resources?orgId=${encodeURIComponent(orgId)}${provider ? `&provider=${encodeURIComponent(provider)}` : ""}`,
    );
  },

  /** Fetch cloud cost breakdown for the last N days for an org. */
  getCost(orgId: string, days = 30): Promise<{ provider: string; entries: CloudCostEntry[] }[]> {
    return request<{ provider: string; entries: CloudCostEntry[] }[]>(
      `/v1/cloud/cost?orgId=${encodeURIComponent(orgId)}&days=${days}`,
    );
  },

  /** Resolve a cloud secret reference to its plain-text value. */
  resolveSecret(ref: string, orgId: string): Promise<{ value: string }> {
    return request<{ value: string }>("/v1/cloud/secrets/resolve", {
      method: "POST",
      body: JSON.stringify({ ref, orgId }),
    });
  },
};

// -- Tag Policy types (FARM-E39) --

export interface CreateTagPolicyInput {
  orgId: string;
  resourceType: string;
  requiredKeys: string[];
  severity: 'warning' | 'error';
}

export interface ListViolationsParams {
  orgId: string;
  provider?: string;
  resourceType?: string;
  resolved?: boolean;
  skip?: number;
  take?: number;
}

// -- Tag Policies API (FARM-E39) --

export const tagPolicies = {
  /** List all tag policies for an organisation. */
  list(orgId: string): Promise<TagPolicy[]> {
    return request<TagPolicy[]>(`/v1/tag-policies?orgId=${encodeURIComponent(orgId)}`);
  },

  /** Create a new tag policy (admin only). */
  create(data: CreateTagPolicyInput): Promise<TagPolicy> {
    return request<TagPolicy>('/v1/tag-policies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update a tag policy (admin only). */
  update(id: string, data: Partial<CreateTagPolicyInput>): Promise<TagPolicy> {
    return request<TagPolicy>(`/v1/tag-policies/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Delete a tag policy (admin only). */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/tag-policies/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** List resource violations with optional filters. */
  listViolations(params: ListViolationsParams): Promise<{ data: ResourceViolation[]; total: number; skip: number; take: number }> {
    const qs = toQueryString({
      orgId: params.orgId,
      ...(params.provider !== undefined && { provider: params.provider }),
      ...(params.resourceType !== undefined && { resourceType: params.resourceType }),
      ...(params.resolved !== undefined && { resolved: String(params.resolved) }),
      ...(params.skip !== undefined && { skip: String(params.skip) }),
      ...(params.take !== undefined && { take: String(params.take) }),
    });
    return request<{ data: ResourceViolation[]; total: number; skip: number; take: number }>(
      `/v1/tag-policies/violations${qs}`,
    );
  },

  /** Mark a violation as resolved. */
  resolveViolation(id: string): Promise<ResourceViolation> {
    return request<ResourceViolation>(
      `/v1/tag-policies/violations/${encodeURIComponent(id)}/resolve`,
      { method: 'PATCH' },
    );
  },

  /** Get compliance summary for an organisation. */
  getComplianceSummary(orgId: string): Promise<ComplianceSummary> {
    return request<ComplianceSummary>(
      `/v1/tag-policies/compliance-summary?orgId=${encodeURIComponent(orgId)}`,
    );
  },

  /** Trigger a tag-audit job for an organisation. */
  triggerAudit(orgId: string): Promise<{ queued: boolean }> {
    return request<{ queued: boolean }>(
      `/v1/tag-policies/audit?orgId=${encodeURIComponent(orgId)}`,
      { method: 'POST' },
    );
  },

  /** Export a tag policy as a Kyverno ClusterPolicy YAML (admin only). */
  exportKyverno(id: string): Promise<{ yaml: string; filename: string }> {
    return request<{ yaml: string; filename: string }>(
      `/v1/tag-policies/${encodeURIComponent(id)}/export/kyverno`,
    );
  },
};

// -- Kyverno Policy Reports API (FARM-E40) --

export const kyverno = {
  /** List namespaced PolicyReport results, optionally filtered by namespace. */
  listPolicyReports(namespace?: string): Promise<KyvernoPolicyReportResult[]> {
    const url = namespace
      ? `/v1/kubernetes/policy-reports?namespace=${encodeURIComponent(namespace)}`
      : '/v1/kubernetes/policy-reports';
    return request<KyvernoPolicyReportResult[]>(url);
  },

  /** List cluster-scoped ClusterPolicyReport results. */
  listClusterPolicyReports(): Promise<KyvernoPolicyReportResult[]> {
    return request<KyvernoPolicyReportResult[]>('/v1/kubernetes/cluster-policy-reports');
  },
};

// -- Istio Service Mesh API (FARM-E42) --

export const istio = {
  /** Check whether Istio is installed in the cluster. */
  getStatus(params?: { kubeconfig?: string }): Promise<{ istioEnabled: boolean }> {
    const qs = params?.kubeconfig
      ? `?kubeconfig=${encodeURIComponent(params.kubeconfig)}`
      : '';
    return request<{ istioEnabled: boolean }>(`/v1/istio/status${qs}`);
  },

  /** List VirtualServices, optionally scoped to a namespace. */
  listVirtualServices(params?: { namespace?: string; kubeconfig?: string }): Promise<IstioVirtualService[]> {
    const query = new URLSearchParams();
    if (params?.namespace) query.set('namespace', params.namespace);
    if (params?.kubeconfig) query.set('kubeconfig', params.kubeconfig);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<IstioVirtualService[]>(`/v1/istio/virtual-services${qs}`);
  },

  /** Get a single VirtualService by namespace and name. */
  getVirtualService(namespace: string, name: string, params?: { kubeconfig?: string }): Promise<IstioVirtualService> {
    const qs = params?.kubeconfig
      ? `?kubeconfig=${encodeURIComponent(params.kubeconfig)}`
      : '';
    return request<IstioVirtualService>(
      `/v1/istio/virtual-services/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}${qs}`,
    );
  },

  /** Patch traffic weights for a VirtualService (admin only). */
  patchWeights(
    namespace: string,
    name: string,
    weights: { destination: string; weight: number }[],
  ): Promise<void> {
    return request<void>(
      `/v1/istio/virtual-services/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/weights`,
      {
        method: 'PATCH',
        body: JSON.stringify({ weights }),
      },
    );
  },

  /** List PeerAuthentication resources for mTLS policy info. */
  listPeerAuthentications(params?: { namespace?: string; kubeconfig?: string }): Promise<IstioPeerAuthentication[]> {
    const query = new URLSearchParams();
    if (params?.namespace) query.set('namespace', params.namespace);
    if (params?.kubeconfig) query.set('kubeconfig', params.kubeconfig);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<IstioPeerAuthentication[]>(`/v1/istio/peer-authentications${qs}`);
  },

  /** List AuthorizationPolicy resources for access control info. */
  listAuthorizationPolicies(params?: { namespace?: string; kubeconfig?: string }): Promise<IstioAuthorizationPolicy[]> {
    const query = new URLSearchParams();
    if (params?.namespace) query.set('namespace', params.namespace);
    if (params?.kubeconfig) query.set('kubeconfig', params.kubeconfig);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<IstioAuthorizationPolicy[]>(`/v1/istio/authorization-policies${qs}`);
  },

  /** Get requests-per-second timeseries for a service. */
  getMetricsRps(params: { service: string; namespace: string; range?: string }): Promise<IstioMetricsTimeseries> {
    const query = new URLSearchParams({ service: params.service, namespace: params.namespace });
    if (params.range) query.set('range', params.range);
    return request<IstioMetricsTimeseries>(`/v1/istio/metrics/rps?${query.toString()}`);
  },

  /** Get error-rate timeseries for a service. */
  getMetricsErrorRate(params: { service: string; namespace: string; range?: string }): Promise<IstioMetricsTimeseries> {
    const query = new URLSearchParams({ service: params.service, namespace: params.namespace });
    if (params.range) query.set('range', params.range);
    return request<IstioMetricsTimeseries>(`/v1/istio/metrics/error-rate?${query.toString()}`);
  },

  /** Get latency percentile timeseries (p50/p95/p99) for a service. */
  getMetricsLatency(params: { service: string; namespace: string; range?: string }): Promise<IstioLatency> {
    const query = new URLSearchParams({ service: params.service, namespace: params.namespace });
    if (params.range) query.set('range', params.range);
    return request<IstioLatency>(`/v1/istio/metrics/latency?${query.toString()}`);
  },

  /** Get service topology edges for an organisation. */
  getTopology(params?: { orgId?: string; kubeconfig?: string }): Promise<IstioTopologyEdge[]> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('orgId', params.orgId);
    if (params?.kubeconfig) query.set('kubeconfig', params.kubeconfig);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<IstioTopologyEdge[]>(`/v1/istio/topology${qs}`);
  },
};

// -- Keycloak / Enterprise SSO API (FARM-E41) --

export const keycloakCredentials = {
  /**
   * List Keycloak OIDC credentials for an organisation.
   * Delegates to the shared integrations/credentials endpoint filtered by type.
   */
  list(orgId: string): Promise<KeycloakCredential[]> {
    return request<KeycloakCredential[]>(
      `/v1/integrations/credentials?orgId=${encodeURIComponent(orgId)}&type=keycloak`,
    );
  },

  /**
   * Create a new Keycloak OIDC credential for an organisation.
   * The `keycloakUrl`, `realm`, `clientId`, and `clientSecret` are stored
   * encrypted via `encryptedValue` in the integrations module.
   */
  create(data: {
    orgId: string;
    name: string;
    keycloakUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
  }): Promise<KeycloakCredential> {
    return request<KeycloakCredential>('/v1/integrations/credentials', {
      method: 'POST',
      body: JSON.stringify({
        orgId: data.orgId,
        type: 'keycloak',
        name: data.name,
        encryptedValue: JSON.stringify({
          keycloakUrl: data.keycloakUrl,
          realm: data.realm,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
        }),
      }),
    });
  },

  /** Delete a Keycloak credential by id. */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/integrations/credentials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

// -- API Catalog and Lifecycle Management (FARM-E47) --

export const apiSpecs = {
  /** List all API specs published by a component. */
  listByComponent(componentId: string): Promise<ApiSpec[]> {
    return request<ApiSpec[]>(`/v1/catalog/components/${componentId}/api-specs`);
  },

  /** Publish a new API spec for a component. */
  create(componentId: string, dto: CreateApiSpecDto): Promise<ApiSpec> {
    return request<ApiSpec>(`/v1/catalog/components/${componentId}/api-specs`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Fetch a single API spec by its id. */
  getOne(id: string): Promise<ApiSpec> {
    return request<ApiSpec>(`/v1/api-specs/${id}`);
  },

  /** Update status, sunsetAt, or deprecatedAt on an API spec (admin only). */
  update(id: string, dto: UpdateApiSpecDto): Promise<ApiSpec> {
    return request<ApiSpec>(`/v1/api-specs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete an API spec (admin only). */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/api-specs/${id}`, { method: "DELETE" });
  },

  /** Compute a diff between two API spec versions. */
  diff(id: string, compareWithId: string): Promise<SpecDiffResult> {
    return request<SpecDiffResult>(
      `/v1/api-specs/${id}/diff?compareWith=${encodeURIComponent(compareWithId)}`,
    );
  },

  /** Register a consumer for an API spec. */
  addConsumer(id: string, dto: AddConsumerDto): Promise<ApiConsumer> {
    return request<ApiConsumer>(`/v1/api-specs/${id}/consumers`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Remove a consumer from an API spec (admin only). */
  removeConsumer(id: string, consumerId: string): Promise<void> {
    return request<void>(`/v1/api-specs/${id}/consumers/${consumerId}`, {
      method: "DELETE",
    });
  },

  /** List all API specs consumed by a component. */
  listConsumedApis(componentId: string): Promise<ApiSpec[]> {
    return request<ApiSpec[]>(`/v1/catalog/components/${componentId}/consumed-apis`);
  },
};

// -- Gateway Routes (FARM-E48) --

export const gateway = {
  /** List gateway routes, optionally filtered by component. */
  listRoutes(componentId?: string): Promise<GatewayRoute[]> {
    const qs = componentId ? `?componentId=${encodeURIComponent(componentId)}` : "";
    return request<GatewayRoute[]>(`/v1/gateway/routes${qs}`);
  },

  /** Get a single gateway route by ID. */
  getRoute(id: string): Promise<GatewayRoute> {
    return request<GatewayRoute>(`/v1/gateway/routes/${id}`);
  },

  /** Trigger a manual route sync (admin only). */
  triggerSync(): Promise<{ message: string }> {
    return request<{ message: string }>(`/v1/gateway/sync`, { method: "POST" });
  },

  /** List API health check results, optionally filtered by apiSpecId. */
  listHealth(apiSpecId?: string): Promise<ApiHealthCheck[]> {
    const qs = apiSpecId ? `?apiSpecId=${encodeURIComponent(apiSpecId)}` : "";
    return request<ApiHealthCheck[]>(`/v1/gateway/health${qs}`);
  },

  /** Trigger an on-demand health check (admin only). */
  triggerHealthCheck(): Promise<{ message: string }> {
    return request<{ message: string }>(`/v1/gateway/health/check`, { method: "POST" });
  },
};

// -- SLO Management (FARM-E51) --

export const slos = {
  /** List SLOs with optional filters and pagination. */
  list(params?: {
    componentId?: string;
    metricType?: string;
    enabled?: boolean;
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<Slo>> {
    const qs = new URLSearchParams();
    if (params?.componentId) qs.set("componentId", params.componentId);
    if (params?.metricType) qs.set("metricType", params.metricType);
    if (params?.enabled !== undefined) qs.set("enabled", String(params.enabled));
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.take !== undefined) qs.set("take", String(params.take));
    const q = qs.toString();
    return request<PaginatedResponse<Slo>>(`/v1/slos${q ? `?${q}` : ""}`);
  },

  /** Get a single SLO by ID. */
  getOne(id: string): Promise<Slo> {
    return request<Slo>(`/v1/slos/${id}`);
  },

  /** Create a new SLO (admin only). */
  create(dto: CreateSloDto): Promise<Slo> {
    return request<Slo>(`/v1/slos`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Update an SLO (admin only). */
  update(id: string, dto: UpdateSloDto): Promise<Slo> {
    return request<Slo>(`/v1/slos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete an SLO (admin only). */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/slos/${id}`, { method: "DELETE" });
  },

  /** Get error budget for an SLO. */
  getBudget(id: string): Promise<SloBudgetResponse> {
    return request<SloBudgetResponse>(`/v1/slos/${id}/budget`);
  },
};

// -- Incident Management (FARM-E52) --

export const incidents = {
  /** List incidents with optional filters and pagination. */
  list(params?: {
    severity?: string;
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<Incident>> {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set("severity", params.severity);
    if (params?.status) qs.set("status", params.status);
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.take !== undefined) qs.set("take", String(params.take));
    const q = qs.toString();
    return request<PaginatedResponse<Incident>>(`/v1/incidents${q ? `?${q}` : ""}`);
  },

  /** Get a single incident by ID with relations. */
  getOne(id: string): Promise<Incident> {
    return request<Incident>(`/v1/incidents/${id}`);
  },

  /** Create a new incident (admin only). */
  create(dto: CreateIncidentDto): Promise<Incident> {
    return request<Incident>(`/v1/incidents`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Update an incident (admin only). */
  update(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    return request<Incident>(`/v1/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Update incident status (admin only). */
  updateStatus(id: string, dto: UpdateIncidentStatusDto): Promise<Incident> {
    return request<Incident>(`/v1/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete an incident (admin only). */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/incidents/${id}`, { method: "DELETE" });
  },

  /** Create a manual timeline entry. */
  createUpdate(incidentId: string, dto: CreateIncidentUpdateDto): Promise<IncidentUpdateEntry> {
    return request<IncidentUpdateEntry>(`/v1/incidents/${incidentId}/updates`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Get timeline entries for an incident. */
  getTimeline(incidentId: string): Promise<IncidentUpdateEntry[]> {
    return request<IncidentUpdateEntry[]>(`/v1/incidents/${incidentId}/timeline`);
  },
};

export const postMortems = {
  /** Create a post-mortem (admin only). */
  create(dto: CreatePostMortemDto): Promise<PostMortem> {
    return request<PostMortem>(`/v1/post-mortems`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Get a post-mortem by ID. */
  getOne(id: string): Promise<PostMortem> {
    return request<PostMortem>(`/v1/post-mortems/${id}`);
  },

  /** Get post-mortem by incident ID. */
  getByIncident(incidentId: string): Promise<PostMortem> {
    return request<PostMortem>(`/v1/post-mortems/by-incident/${incidentId}`);
  },

  /** Update a post-mortem (admin only). */
  update(id: string, dto: UpdatePostMortemDto): Promise<PostMortem> {
    return request<PostMortem>(`/v1/post-mortems/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Approve a post-mortem (admin only). The approver is derived from the JWT token. */
  approve(id: string): Promise<PostMortem> {
    return request<PostMortem>(`/v1/post-mortems/${id}/approve`, {
      method: "PATCH",
    });
  },
};

// -- Custom Dashboard Builder (FARM-E53) --

export const dashboards = {
  /** List dashboards with optional filters and pagination. */
  list(params?: {
    ownerId?: string;
    visibility?: string;
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<Dashboard>> {
    const qs = new URLSearchParams();
    if (params?.ownerId) qs.set("ownerId", params.ownerId);
    if (params?.visibility) qs.set("visibility", params.visibility);
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.take !== undefined) qs.set("take", String(params.take));
    const q = qs.toString();
    return request<PaginatedResponse<Dashboard>>(`/v1/dashboards${q ? `?${q}` : ""}`);
  },

  /** Get a single dashboard by ID with widgets. */
  getOne(id: string): Promise<Dashboard> {
    return request<Dashboard>(`/v1/dashboards/${id}`);
  },

  /** Create a new dashboard. */
  create(dto: CreateDashboardDto): Promise<Dashboard> {
    return request<Dashboard>(`/v1/dashboards`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Update a dashboard. */
  update(id: string, dto: UpdateDashboardDto): Promise<Dashboard> {
    return request<Dashboard>(`/v1/dashboards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Update dashboard layout (bulk widget position update). */
  updateLayout(id: string, dto: UpdateLayoutDto): Promise<Dashboard> {
    return request<Dashboard>(`/v1/dashboards/${id}/layout`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete a dashboard. */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/dashboards/${id}`, { method: "DELETE" });
  },

  /** Add a widget to a dashboard. */
  createWidget(dashboardId: string, dto: CreateWidgetDto): Promise<DashboardWidget> {
    return request<DashboardWidget>(`/v1/dashboards/${dashboardId}/widgets`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Update a widget. */
  updateWidget(
    dashboardId: string,
    widgetId: string,
    dto: UpdateWidgetDto,
  ): Promise<DashboardWidget> {
    return request<DashboardWidget>(`/v1/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete a widget. */
  removeWidget(dashboardId: string, widgetId: string): Promise<void> {
    return request<void>(`/v1/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "DELETE",
    });
  },

  /** Get widget data. */
  getWidgetData(dashboardId: string, widgetId: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(
      `/v1/dashboards/${dashboardId}/widgets/${widgetId}/data`,
    );
  },
};

// -- Service Templates (FARM-E57) --

export const serviceTemplates = {
  /** List service templates with optional filters and pagination. */
  list(params?: {
    language?: string;
    framework?: string;
    organizationId?: string;
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<ServiceTemplate>> {
    return request<PaginatedResponse<ServiceTemplate>>(
      `/v1/service-templates${toQueryString(params ?? {})}`,
    );
  },

  /** Get a service template by ID. */
  get(id: string): Promise<ServiceTemplate> {
    return request<ServiceTemplate>(`/v1/service-templates/${id}`);
  },

  /** Create a new service template. */
  create(dto: CreateServiceTemplateDto): Promise<ServiceTemplate> {
    return request<ServiceTemplate>(`/v1/service-templates`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Update a service template. */
  update(id: string, dto: UpdateServiceTemplateDto): Promise<ServiceTemplate> {
    return request<ServiceTemplate>(`/v1/service-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete a service template. */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/service-templates/${id}`, { method: "DELETE" });
  },

  /** Scaffold a new service from a template. */
  scaffold(templateId: string, dto: CreateScaffoldRequestDto): Promise<ScaffoldRequest> {
    return request<ScaffoldRequest>(`/v1/service-templates/${templateId}/scaffold`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Dry-run scaffold to preview rendered file tree. */
  scaffoldDryRun(templateId: string, dto: CreateScaffoldRequestDto): Promise<ScaffoldRequest> {
    return request<ScaffoldRequest>(`/v1/service-templates/${templateId}/scaffold/dry-run`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },
};

// -- Environment Requests (FARM-E58) --

export const environmentRequests = {
  /** List environment requests with optional filters and pagination. */
  list(params?: {
    status?: string;
    type?: string;
    requestedBy?: string;
    organizationId?: string;
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<EnvironmentRequest>> {
    return request<PaginatedResponse<EnvironmentRequest>>(
      `/v1/environment-requests${toQueryString(params ?? {})}`,
    );
  },

  /** Get an environment request by ID. */
  get(id: string): Promise<EnvironmentRequest> {
    return request<EnvironmentRequest>(`/v1/environment-requests/${id}`);
  },

  /** Create a new environment request. */
  create(dto: CreateEnvironmentRequestDto): Promise<EnvironmentRequest> {
    return request<EnvironmentRequest>(`/v1/environment-requests`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /** Update an environment request (only while pending). */
  update(id: string, dto: UpdateEnvironmentRequestDto): Promise<EnvironmentRequest> {
    return request<EnvironmentRequest>(`/v1/environment-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /** Delete an environment request. */
  remove(id: string): Promise<void> {
    return request<void>(`/v1/environment-requests/${id}`, { method: "DELETE" });
  },

  /** Approve an environment request. */
  approve(id: string, dto?: ReviewEnvironmentRequestDto): Promise<EnvironmentRequest> {
    return request<EnvironmentRequest>(`/v1/environment-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(dto ?? {}),
    });
  },

  /** Reject an environment request. */
  reject(id: string, dto?: ReviewEnvironmentRequestDto): Promise<EnvironmentRequest> {
    return request<EnvironmentRequest>(`/v1/environment-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(dto ?? {}),
    });
  },

  /** Expire an active environment request. */
  expire(id: string): Promise<EnvironmentRequest> {
    return request<EnvironmentRequest>(`/v1/environment-requests/${id}/expire`, {
      method: "POST",
    });
  },
};
