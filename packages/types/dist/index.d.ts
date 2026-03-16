export declare enum ComponentKind {
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
    CERTIFICATE = "certificate"
}
export declare enum ComponentLifecycle {
    PLANNED = "planned",
    EXPERIMENTAL = "experimental",
    PRODUCTION = "production",
    DEPRECATED = "deprecated",
    DECOMMISSIONED = "decommissioned"
}
export declare enum ComponentKindGroup {
    DEV = "dev",
    INFRA = "infra",
    DATA = "data",
    SECURITY = "security"
}
export declare enum DeploymentStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    ROLLED_BACK = "rolled_back"
}
export declare enum EnvironmentType {
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production",
    SANDBOX = "sandbox"
}
export declare enum TeamType {
    DEV = "dev",
    INFRA = "infra",
    SECURITY = "security",
    DATA = "data",
    PLATFORM = "platform",
    OTHER = "other"
}
export declare enum FarmEvent {
    COMPONENT_CREATED = "component.created",
    COMPONENT_UPDATED = "component.updated",
    COMPONENT_DELETED = "component.deleted",
    DEPLOYMENT_CREATED = "deployment.created",
    DEPLOYMENT_UPDATED = "deployment.updated",
    PIPELINE_RUN_UPDATED = "pipeline.run.updated",
    PIPELINE_LOG = "pipeline.log",
    AUDIT_LOG_CREATED = "audit-log.created"
}
/**
 * Represents the lifecycle status of a pipeline run.
 */
export declare enum PipelineRunStatus {
    QUEUED = "queued",
    RUNNING = "running",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
/**
 * Represents the role a user holds within an organization.
 * OWNER has full control, ADMIN can manage resources, MEMBER has read access.
 */
export declare enum OrgRole {
    OWNER = "owner",
    ADMIN = "admin",
    MEMBER = "member"
}
//# sourceMappingURL=index.d.ts.map