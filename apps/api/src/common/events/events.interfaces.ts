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
  AUDIT_LOG_CREATED = "audit-log.created",
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
