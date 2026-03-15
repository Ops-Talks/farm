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
    DEPLOYMENT_UPDATED = "deployment.updated"
}
//# sourceMappingURL=index.d.ts.map