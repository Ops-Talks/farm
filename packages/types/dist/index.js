"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgRole = exports.PipelineRunStatus = exports.FarmEvent = exports.TeamType = exports.EnvironmentType = exports.DeploymentStatus = exports.ComponentKindGroup = exports.ComponentLifecycle = exports.ComponentKind = void 0;
var ComponentKind;
(function (ComponentKind) {
    ComponentKind["SERVICE"] = "service";
    ComponentKind["LIBRARY"] = "library";
    ComponentKind["WEBSITE"] = "website";
    ComponentKind["API"] = "api";
    ComponentKind["COMPONENT"] = "component";
    ComponentKind["SYSTEM"] = "system";
    ComponentKind["DOMAIN"] = "domain";
    ComponentKind["RESOURCE"] = "resource";
    ComponentKind["PIPELINE"] = "pipeline";
    ComponentKind["QUEUE"] = "queue";
    ComponentKind["DATABASE"] = "database";
    ComponentKind["STORAGE"] = "storage";
    ComponentKind["CLUSTER"] = "cluster";
    ComponentKind["NETWORK"] = "network";
    ComponentKind["DATASET"] = "dataset";
    ComponentKind["DATA_PIPELINE"] = "data-pipeline";
    ComponentKind["ML_MODEL"] = "ml-model";
    ComponentKind["SECRET"] = "secret";
    ComponentKind["POLICY"] = "policy";
    ComponentKind["CERTIFICATE"] = "certificate";
})(ComponentKind || (exports.ComponentKind = ComponentKind = {}));
var ComponentLifecycle;
(function (ComponentLifecycle) {
    ComponentLifecycle["PLANNED"] = "planned";
    ComponentLifecycle["EXPERIMENTAL"] = "experimental";
    ComponentLifecycle["PRODUCTION"] = "production";
    ComponentLifecycle["DEPRECATED"] = "deprecated";
    ComponentLifecycle["DECOMMISSIONED"] = "decommissioned";
})(ComponentLifecycle || (exports.ComponentLifecycle = ComponentLifecycle = {}));
var ComponentKindGroup;
(function (ComponentKindGroup) {
    ComponentKindGroup["DEV"] = "dev";
    ComponentKindGroup["INFRA"] = "infra";
    ComponentKindGroup["DATA"] = "data";
    ComponentKindGroup["SECURITY"] = "security";
})(ComponentKindGroup || (exports.ComponentKindGroup = ComponentKindGroup = {}));
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "pending";
    DeploymentStatus["IN_PROGRESS"] = "in_progress";
    DeploymentStatus["SUCCEEDED"] = "succeeded";
    DeploymentStatus["FAILED"] = "failed";
    DeploymentStatus["ROLLED_BACK"] = "rolled_back";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
var EnvironmentType;
(function (EnvironmentType) {
    EnvironmentType["DEVELOPMENT"] = "development";
    EnvironmentType["STAGING"] = "staging";
    EnvironmentType["PRODUCTION"] = "production";
    EnvironmentType["SANDBOX"] = "sandbox";
})(EnvironmentType || (exports.EnvironmentType = EnvironmentType = {}));
var TeamType;
(function (TeamType) {
    TeamType["DEV"] = "dev";
    TeamType["INFRA"] = "infra";
    TeamType["SECURITY"] = "security";
    TeamType["DATA"] = "data";
    TeamType["PLATFORM"] = "platform";
    TeamType["OTHER"] = "other";
})(TeamType || (exports.TeamType = TeamType = {}));
var FarmEvent;
(function (FarmEvent) {
    FarmEvent["COMPONENT_CREATED"] = "component.created";
    FarmEvent["COMPONENT_UPDATED"] = "component.updated";
    FarmEvent["COMPONENT_DELETED"] = "component.deleted";
    FarmEvent["DEPLOYMENT_CREATED"] = "deployment.created";
    FarmEvent["DEPLOYMENT_UPDATED"] = "deployment.updated";
    FarmEvent["PIPELINE_RUN_UPDATED"] = "pipeline.run.updated";
    FarmEvent["PIPELINE_LOG"] = "pipeline.log";
    FarmEvent["AUDIT_LOG_CREATED"] = "audit-log.created";
})(FarmEvent || (exports.FarmEvent = FarmEvent = {}));
/**
 * Represents the lifecycle status of a pipeline run.
 */
var PipelineRunStatus;
(function (PipelineRunStatus) {
    PipelineRunStatus["QUEUED"] = "queued";
    PipelineRunStatus["RUNNING"] = "running";
    PipelineRunStatus["SUCCEEDED"] = "succeeded";
    PipelineRunStatus["FAILED"] = "failed";
    PipelineRunStatus["CANCELLED"] = "cancelled";
    PipelineRunStatus["WAITING_APPROVAL"] = "waiting_approval";
})(PipelineRunStatus || (exports.PipelineRunStatus = PipelineRunStatus = {}));
/**
 * Represents the role a user holds within an organization.
 * OWNER has full control, ADMIN can manage resources, MEMBER has read access.
 */
var OrgRole;
(function (OrgRole) {
    OrgRole["OWNER"] = "owner";
    OrgRole["ADMIN"] = "admin";
    OrgRole["MEMBER"] = "member";
})(OrgRole || (exports.OrgRole = OrgRole = {}));
//# sourceMappingURL=index.js.map