// Farm API type definitions
// Mirrors the backend DTOs for type-safe API communication

// -- Enums --

export enum ComponentKind {
  SERVICE = "service",
  LIBRARY = "library",
  WEBSITE = "website",
  API = "api",
  COMPONENT = "component",
  SYSTEM = "system",
  DOMAIN = "domain",
  RESOURCE = "resource",
  PIPELINE = "pipeline",
  QUEUE = "queue",
  DATABASE = "database",
  STORAGE = "storage",
  CLUSTER = "cluster",
  NETWORK = "network",
  DATASET = "dataset",
  DATA_PIPELINE = "data-pipeline",
  ML_MODEL = "ml-model",
  SECRET = "secret",
  POLICY = "policy",
  CERTIFICATE = "certificate",
}

export enum ComponentLifecycle {
  PLANNED = "planned",
  EXPERIMENTAL = "experimental",
  PRODUCTION = "production",
  DEPRECATED = "deprecated",
  DECOMMISSIONED = "decommissioned",
}

export enum ComponentKindGroup {
  DEV = "dev",
  INFRA = "infra",
  DATA = "data",
  SECURITY = "security",
}

export enum DeploymentStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  ROLLED_BACK = "rolled_back",
}

export enum EnvironmentType {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  SANDBOX = "sandbox",
}

export enum TeamType {
  DEV = "dev",
  INFRA = "infra",
  SECURITY = "security",
  DATA = "data",
  PLATFORM = "platform",
  OTHER = "other",
}

export enum FarmEvent {
  COMPONENT_CREATED = "component.created",
  COMPONENT_UPDATED = "component.updated",
  COMPONENT_DELETED = "component.deleted",
  DEPLOYMENT_CREATED = "deployment.created",
  DEPLOYMENT_UPDATED = "deployment.updated",
}

// -- Entities --

export interface ComponentLink {
  title: string;
  url: string;
  icon?: string;
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
