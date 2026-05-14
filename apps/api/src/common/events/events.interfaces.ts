/**
 * Event types emitted via the WebSocket gateway.
 */
export enum FarmEvent {
  COMPONENT_CREATED = "component.created",
  COMPONENT_UPDATED = "component.updated",
  COMPONENT_DELETED = "component.deleted",
  DEPLOYMENT_CREATED = "deployment.created",
  DEPLOYMENT_UPDATED = "deployment.updated",
  PIPELINE_RUN_UPDATED = "pipeline.run.updated",
  PIPELINE_LOG = "pipeline.log",
  PIPELINE_STAGE_UPDATED = "pipeline.stage.updated",
  AUDIT_LOG_CREATED = "audit-log.created",
  ROLLOUT_UPDATED = "rollout.updated",
  CI_BUILD_UPDATED = "ci.build.updated",
  COMPLIANCE_AUDIT_COMPLETED = "compliance.audit.completed",
  API_SPEC_DEPRECATED = "api-spec:deprecated",
  GATEWAY_ROUTE_SYNCED = "gateway.route.synced",
  API_HEALTH_CHANGED = "api.health.changed",
  INCIDENT_CREATED = "incident.created",
  INCIDENT_STATUS_CHANGED = "incident.status-changed",
  SCAFFOLD_COMPLETED = "scaffold.completed",
  SCAFFOLD_FAILED = "scaffold.failed",
  ENV_REQUEST_CREATED = "env-request.created",
  ENV_REQUEST_DECIDED = "env-request.decided",
  ENV_REQUEST_PROVISIONED = "env-request.provisioned",
  ENV_REQUEST_EXPIRED = "env-request.expired",
  CONTAINER_VULNERABILITY_FOUND = "container:vulnerability-found",
  FLUX_RECONCILIATION_FAILED = "flux:reconciliation-failed",
  COST_BUDGET_EXCEEDED = "cost:budget-exceeded",
  COST_ACTUAL_BUDGET_EXCEEDED = "cost:actual-budget-exceeded",
}

/**
 * Payload structure for component-related events.
 */
export interface ComponentEventPayload {
  id: string;
  name: string;
  kind: string;
  owner: string;
  timestamp: string;
}

/**
 * Payload structure for deployment-related events.
 */
export interface DeploymentEventPayload {
  id: string;
  componentId: string;
  environmentId: string;
  version: string;
  status: string;
  timestamp: string;
}

/**
 * Payload structure for pipeline run status-change events.
 */
export interface PipelineRunUpdatedPayload {
  id: string;
  pipelineId: string;
  status: string;
  triggeredBy: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  timestamp: string;
}

/**
 * Payload structure for per-stage log-line events emitted during a run.
 */
export interface PipelineLogPayload {
  runId: string;
  stage: string;
  message: string;
  timestamp: string;
}

/**
 * Payload structure for per-stage status-change events emitted during a run.
 */
export interface PipelineStageUpdatedPayload {
  runId: string;
  pipelineId: string;
  stageId: string;
  status: string;
  externalRunId?: string | null;
  externalRunUrl?: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  timestamp: string;
}

/**
 * Payload structure for incident creation events.
 */
export interface IncidentEventPayload {
  id: string;
  title: string;
  severity: string;
  status: string;
  timestamp: string;
}

/**
 * Payload structure for incident status-change events.
 */
export interface IncidentStatusChangedPayload {
  id: string;
  title: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
}

/**
 * Payload structure for scaffold completion/failure events.
 */
export interface ScaffoldEventPayload {
  id: string;
  templateName: string;
  targetRepository: string;
  status: string;
  requestedBy: string;
  timestamp: string;
}

/**
 * Payload structure for environment request lifecycle events.
 */
export interface EnvironmentRequestEventPayload {
  id: string;
  name: string;
  type: string;
  status: string;
  requestedBy: string;
  timestamp: string;
}

/**
 * Payload structure for container vulnerability detection events.
 */
export interface ContainerVulnerabilityFoundPayload {
  componentId: string;
  componentName: string;
  criticalCount: number;
  image: string;
  tag: string;
  timestamp: string;
}

/**
 * Payload for cost:budget-exceeded events (infracost diff exceeded budget).
 */
export interface CostBudgetExceededPayload {
  componentId: string;
  delta: number;
  pipelineRunId: string | null;
  timestamp: string;
}

/**
 * Payload for cost:actual-budget-exceeded events (OpenCost total exceeded budget).
 */
export interface CostActualBudgetExceededPayload {
  componentId: string;
  totalCost: number;
  budgetUsd: number;
  timestamp: string;
}
