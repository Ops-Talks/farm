import type {
  AlertingRule,
  CatalogComponent,
  Deployment,
  DeploymentMatrixRow,
  DocumentationEntry,
  DocumentationSearchResult,
  DocumentationTreeNode,
  Environment,
  ErrorResponse,
  HealthStatus,
  JaegerTrace,
  JaegerTracesResponse,
  JobInfo,
  LokiLabelsResponse,
  LokiLogsResponse,
  LoginRequest,
  LoginResponse,
  ObservabilitySummary,
  Organization,
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
  Team,
  User,
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
