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
    AUDIT_LOG_CREATED = "audit-log.created",
    COST_ACTUAL_BUDGET_EXCEEDED = "cost:actual-budget-exceeded"
}
/**
 * Represents the lifecycle status of a pipeline run.
 */
export declare enum PipelineRunStatus {
    QUEUED = "queued",
    RUNNING = "running",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    CANCELLED = "cancelled",
    WAITING_APPROVAL = "waiting_approval"
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
/**
 * Token-based organization invitation (Phase 37).
 * The `token` field is only included in admin-facing responses immediately
 * after creation; never exposed via the public preview endpoint.
 */
export interface InvitationToken {
    id: string;
    token: string;
    type: "org-invite";
    email: string;
    orgId: string;
    invitedBy: string;
    role: OrgRole;
    message?: string | null;
    status: "pending" | "accepted" | "revoked";
    createdAt: string;
    expiresAt: string;
    acceptedAt?: string | null;
    acceptedBy?: string | null;
}
/**
 * Public preview shown on the invitation accept page (no token leak).
 */
export interface InvitationPreview {
    orgName: string;
    role: OrgRole;
    invitedByName: string;
    expiresAt: string;
    message?: string | null;
}
/**
 * Org membership summary embedded in `ManagedUser`.
 */
interface ManagedUserOrgMembership {
    orgId: string;
    orgSlug: string;
    orgName: string;
    role: OrgRole;
}
/**
 * User view returned by the user management dashboard endpoints.
 */
export interface ManagedUser {
    id: string;
    username: string;
    email: string;
    displayName: string;
    roles: string[];
    suspended: boolean;
    lastLogin: string | null;
    createdAt: string;
    orgMemberships: ManagedUserOrgMembership[];
}
/**
 * Paginated response wrapper for the user management list endpoint.
 */
export interface UserListResponse {
    users: ManagedUser[];
    total: number;
    page: number;
    pageSize: number;
}
export {};
//# sourceMappingURL=index.d.ts.map