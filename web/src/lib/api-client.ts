import type {
  CatalogComponent,
  Deployment,
  Environment,
  ErrorResponse,
  HealthStatus,
  LoginRequest,
  LoginResponse,
  PaginatedResponse,
  PaginationQuery,
  RefreshTokenRequest,
  RefreshTokenResponse,
  Team,
  User,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

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
    query?: PaginationQuery & { kind?: string; lifecycle?: string; owner?: string; search?: string },
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
};

// -- Environments API --

export const environments = {
  list(): Promise<Environment[]> {
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
    return request(`/v1/environments/deployments${toQueryString(query ?? {})}`);
  },

  get(id: string): Promise<Deployment> {
    return request(`/v1/environments/deployments/${id}`);
  },

  create(data: Partial<Deployment>): Promise<Deployment> {
    return request("/v1/environments/deployments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Deployment>): Promise<Deployment> {
    return request(`/v1/environments/deployments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  matrix(query?: { kind?: string; lifecycle?: string; owner?: string }): Promise<unknown> {
    return request(`/v1/deployments/matrix${toQueryString(query ?? {})}`);
  },
};

// -- Teams API --

export const teams = {
  list(): Promise<Team[]> {
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
};

// -- Health API --

export const health = {
  check(): Promise<HealthStatus> {
    return request("/health");
  },
};
