import { MigrationInterface, QueryRunner } from "typeorm";

export class SnakeCaseColumns9990000000000 implements MigrationInterface {
  name = "SnakeCaseColumns9990000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: if no camelCase columns exist, the schema was already created
    // with SnakeNamingStrategy (fresh install) — skip all renames.
    const rows = (await queryRunner.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'pipelines' AND column_name = 'organizationId'
      ) AS "exists"`,
    )) as { exists: boolean }[];
    if (!rows[0]?.exists) {
      return;
    }
    // pipelines
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "createdBy" TO "created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // pipeline_runs
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "pipelineId" TO "pipeline_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "triggeredBy" TO "triggered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "startedAt" TO "started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "finishedAt" TO "finished_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "durationMs" TO "duration_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "stageResults" TO "stage_results"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // users
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "displayName" TO "display_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "firstName" TO "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "lastName" TO "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "refreshToken" TO "refresh_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "oauthProvider" TO "oauth_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "oauthProviderId" TO "oauth_provider_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "lastLogin" TO "last_login"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // organizations
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "ownerId" TO "owner_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // user_organizations
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // org_invitations
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "tokenHash" TO "token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "expiresAt" TO "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "invitedByUserId" TO "invited_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // components
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "teamId" TO "team_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "costBudgetUsd" TO "cost_budget_usd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "argocdApp" TO "argocd_app"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "containerImage" TO "container_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "helmChart" TO "helm_chart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // environments
    await queryRunner.query(
      `ALTER TABLE "environments" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // deployments
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "deployedBy" TO "deployed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "commitSha" TO "commit_sha"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "environmentId" TO "environment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "startedAt" TO "started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "finishedAt" TO "finished_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // incidents
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "commanderUserId" TO "commander_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "resolvedAt" TO "resolved_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // incident_updates
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "incidentId" TO "incident_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "authorId" TO "author_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "previousStatus" TO "previous_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "newStatus" TO "new_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "createdAt" TO "created_at"`,
    );

    // post_mortems
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "incidentId" TO "incident_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "rootCause" TO "root_cause"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "contributingFactors" TO "contributing_factors"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "actionItems" TO "action_items"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "approvedBy" TO "approved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "approvedAt" TO "approved_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // teams
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "displayName" TO "display_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "contactEmail" TO "contact_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "slackChannel" TO "slack_channel"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "externalId" TO "external_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // incident_components (JoinTable)
    await queryRunner.query(
      `ALTER TABLE "incident_components" RENAME COLUMN "incidentsId" TO "incidents_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_components" RENAME COLUMN "componentsId" TO "components_id"`,
    );
    // incident_environments (JoinTable)
    await queryRunner.query(
      `ALTER TABLE "incident_environments" RENAME COLUMN "incidentsId" TO "incidents_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_environments" RENAME COLUMN "environmentsId" TO "environments_id"`,
    );
    // team_members (JoinTable)
    await queryRunner.query(
      `ALTER TABLE "team_members" RENAME COLUMN "teamId" TO "team_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" RENAME COLUMN "userId" TO "user_id"`,
    );

    // audit_logs
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "resourceType" TO "resource_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "resourceId" TO "resource_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "actorId" TO "actor_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "actorUsername" TO "actor_username"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at"`,
    );

    // dashboards
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "ownerId" TO "owner_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // dashboard_widgets
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "dashboardId" TO "dashboard_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "gridX" TO "grid_x"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "gridY" TO "grid_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "gridW" TO "grid_w"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "gridH" TO "grid_h"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // iac_stacks
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "repositoryUrl" TO "repository_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "basePath" TO "base_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "externalToolUrl" TO "external_tool_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "autoImported" TO "auto_imported"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // iac_runs
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "stackId" TO "stack_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "resourceChanges" TO "resource_changes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "triggeredBy" TO "triggered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "pipelineUrl" TO "pipeline_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "startedAt" TO "started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "finishedAt" TO "finished_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "durationMs" TO "duration_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // iac_modules
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "sourceRepoUrl" TO "source_repo_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "latestVersion" TO "latest_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // iac_module_versions
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "moduleId" TO "module_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "variablesMeta" TO "variables_meta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "outputsMeta" TO "outputs_meta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "syncedAt" TO "synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // iac_resources
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "stackId" TO "stack_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "resourceType" TO "resource_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "resourceName" TO "resource_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // iac_resource_dependencies
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "stackId" TO "stack_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "sourceAddress" TO "source_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "targetAddress" TO "target_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "createdAt" TO "created_at"`,
    );

    // iac_module_drifts
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "stackPath" TO "stack_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "moduleName" TO "module_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "sourceUrl" TO "source_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "currentRef" TO "current_ref"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "latestRef" TO "latest_ref"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "versionsBehind" TO "versions_behind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "detectedAt" TO "detected_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // component_elasticsearch_indices
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "indexPattern" TO "index_pattern"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "esUrl" TO "es_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // api_specs
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "deprecatedAt" TO "deprecated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "sunsetAt" TO "sunset_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // api_consumers
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "apiSpecId" TO "api_spec_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "consumerComponentId" TO "consumer_component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "consumerTeamId" TO "consumer_team_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "addedAt" TO "added_at"`,
    );

    // gateway_routes
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "externalId" TO "external_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "gatewayType" TO "gateway_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "syncedAt" TO "synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // api_health_checks
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "latencyMs" TO "latency_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "apiSpecId" TO "api_spec_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "checkedAt" TO "checked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "createdAt" TO "created_at"`,
    );

    // cost_estimates
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "pipelineRunId" TO "pipeline_run_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "estimatedMonthlyCost" TO "estimated_monthly_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "diffMonthlyCost" TO "diff_monthly_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "measuredAt" TO "measured_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // actual_costs
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "cpuCost" TO "cpu_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "memoryCost" TO "memory_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "pvCost" TO "pv_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "networkCost" TO "network_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "totalCost" TO "total_cost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "syncedAt" TO "synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // slos
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "targetPercent" TO "target_percent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "metricType" TO "metric_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // alerting_rules
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "environmentId" TO "environment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // documentation
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "sourceUrl" TO "source_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "parentId" TO "parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // documentation_builds
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "repoUrl" TO "repo_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "sourceType" TO "source_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "buildLog" TO "build_log"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "artifactsPath" TO "artifacts_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "triggeredAt" TO "triggered_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "completedAt" TO "completed_at"`,
    );

    // keda_bindings
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "scaledObjectName" TO "scaled_object_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "scaledObjectNamespace" TO "scaled_object_namespace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "boundAt" TO "bound_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "organizationId" TO "organization_id"`,
    );

    // flux_bindings
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "resourceKind" TO "resource_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "resourceName" TO "resource_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "resourceNamespace" TO "resource_namespace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "boundAt" TO "bound_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "organizationId" TO "organization_id"`,
    );

    // operator_bindings
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "operatorName" TO "operator_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "operatorNamespace" TO "operator_namespace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "addedAt" TO "added_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "organizationId" TO "organization_id"`,
    );

    // environment_requests
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "requestedBy" TO "requested_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "ttlHours" TO "ttl_hours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "statusMessage" TO "status_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "reviewedBy" TO "reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "reviewedAt" TO "reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "provisionedAt" TO "provisioned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "expiresAt" TO "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "environmentId" TO "environment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // integration_credentials
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "orgId" TO "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "encryptedValue" TO "encrypted_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // container_vulnerabilities
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "cveId" TO "cve_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "packageName" TO "package_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "installedVersion" TO "installed_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "fixedVersion" TO "fixed_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "scannedAt" TO "scanned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // tag_policies
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "orgId" TO "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "resourceType" TO "resource_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "requiredKeys" TO "required_keys"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // resource_violations
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "orgId" TO "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "resourceId" TO "resource_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "resourceType" TO "resource_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "missingKeys" TO "missing_keys"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "linkedComponentId" TO "linked_component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "detectedAt" TO "detected_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "resolvedAt" TO "resolved_at"`,
    );

    // plugin_registry
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "pluginId" TO "plugin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "latestVersion" TO "latest_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "installCount" TO "install_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // plugin_instances
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "pluginId" TO "plugin_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "orgId" TO "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "healthStatus" TO "health_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "installedAt" TO "installed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // password_resets
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "userId" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "tempPasswordHash" TO "temp_password_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "expiresAt" TO "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "usedAt" TO "used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "createdAt" TO "created_at"`,
    );

    // scaffold_requests
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "templateId" TO "template_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "templateName" TO "template_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "targetRepository" TO "target_repository"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "statusMessage" TO "status_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "requestedBy" TO "requested_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "dryRun" TO "dry_run"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "renderedFiles" TO "rendered_files"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // service_templates
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "repositoryUrl" TO "repository_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "isBuiltIn" TO "is_built_in"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // search_configs
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "organizationId" TO "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "titleBoost" TO "title_boost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "tagsBoost" TO "tags_boost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "descriptionBoost" TO "description_boost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // opa_results
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "componentId" TO "component_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "policyPath" TO "policy_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "evaluatedAt" TO "evaluated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    // invitation_tokens
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "orgId" TO "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "invitedBy" TO "invited_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "expiresAt" TO "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "acceptedAt" TO "accepted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "acceptedBy" TO "accepted_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "createdAt" TO "created_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // invitation_tokens
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "accepted_by" TO "acceptedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "accepted_at" TO "acceptedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "expires_at" TO "expiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "invited_by" TO "invitedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_tokens" RENAME COLUMN "org_id" TO "orgId"`,
    );

    // opa_results
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "evaluated_at" TO "evaluatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "policy_path" TO "policyPath"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opa_results" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // search_configs
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "description_boost" TO "descriptionBoost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "tags_boost" TO "tagsBoost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "title_boost" TO "titleBoost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_configs" RENAME COLUMN "organization_id" TO "organizationId"`,
    );

    // service_templates
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "is_built_in" TO "isBuiltIn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_templates" RENAME COLUMN "repository_url" TO "repositoryUrl"`,
    );

    // scaffold_requests
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "rendered_files" TO "renderedFiles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "dry_run" TO "dryRun"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "requested_by" TO "requestedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "status_message" TO "statusMessage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "target_repository" TO "targetRepository"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "template_name" TO "templateName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scaffold_requests" RENAME COLUMN "template_id" TO "templateId"`,
    );

    // password_resets
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "used_at" TO "usedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "expires_at" TO "expiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "temp_password_hash" TO "tempPasswordHash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_resets" RENAME COLUMN "user_id" TO "userId"`,
    );

    // plugin_instances
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "installed_at" TO "installedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "health_status" TO "healthStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "org_id" TO "orgId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_instances" RENAME COLUMN "plugin_id" TO "pluginId"`,
    );

    // plugin_registry
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "install_count" TO "installCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "latest_version" TO "latestVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plugin_registry" RENAME COLUMN "plugin_id" TO "pluginId"`,
    );

    // resource_violations
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "resolved_at" TO "resolvedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "detected_at" TO "detectedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "linked_component_id" TO "linkedComponentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "missing_keys" TO "missingKeys"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "resource_type" TO "resourceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "resource_id" TO "resourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource_violations" RENAME COLUMN "org_id" TO "orgId"`,
    );

    // tag_policies
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "required_keys" TO "requiredKeys"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "resource_type" TO "resourceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag_policies" RENAME COLUMN "org_id" TO "orgId"`,
    );

    // container_vulnerabilities
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "scanned_at" TO "scannedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "fixed_version" TO "fixedVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "installed_version" TO "installedVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "package_name" TO "packageName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "cve_id" TO "cveId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // integration_credentials
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "encrypted_value" TO "encryptedValue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration_credentials" RENAME COLUMN "org_id" TO "orgId"`,
    );

    // environment_requests
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "environment_id" TO "environmentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "expires_at" TO "expiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "provisioned_at" TO "provisionedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "reviewed_at" TO "reviewedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "reviewed_by" TO "reviewedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "status_message" TO "statusMessage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "ttl_hours" TO "ttlHours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environment_requests" RENAME COLUMN "requested_by" TO "requestedBy"`,
    );

    // operator_bindings
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "added_at" TO "addedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "operator_namespace" TO "operatorNamespace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_bindings" RENAME COLUMN "operator_name" TO "operatorName"`,
    );

    // flux_bindings
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "bound_at" TO "boundAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "resource_namespace" TO "resourceNamespace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "resource_name" TO "resourceName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flux_bindings" RENAME COLUMN "resource_kind" TO "resourceKind"`,
    );

    // keda_bindings
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "bound_at" TO "boundAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "scaled_object_namespace" TO "scaledObjectNamespace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keda_bindings" RENAME COLUMN "scaled_object_name" TO "scaledObjectName"`,
    );

    // documentation_builds
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "completed_at" TO "completedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "triggered_at" TO "triggeredAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "artifacts_path" TO "artifactsPath"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "build_log" TO "buildLog"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "source_type" TO "sourceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "repo_url" TO "repoUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // documentation
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "parent_id" TO "parentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" RENAME COLUMN "source_url" TO "sourceUrl"`,
    );

    // alerting_rules
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "environment_id" TO "environmentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerting_rules" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // slos
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "metric_type" TO "metricType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slos" RENAME COLUMN "target_percent" TO "targetPercent"`,
    );

    // actual_costs
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "synced_at" TO "syncedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "total_cost" TO "totalCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "network_cost" TO "networkCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "pv_cost" TO "pvCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "memory_cost" TO "memoryCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "cpu_cost" TO "cpuCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // cost_estimates
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "measured_at" TO "measuredAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "diff_monthly_cost" TO "diffMonthlyCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "estimated_monthly_cost" TO "estimatedMonthlyCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "pipeline_run_id" TO "pipelineRunId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // api_health_checks
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "checked_at" TO "checkedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "api_spec_id" TO "apiSpecId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_health_checks" RENAME COLUMN "latency_ms" TO "latencyMs"`,
    );

    // gateway_routes
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "synced_at" TO "syncedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "gateway_type" TO "gatewayType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" RENAME COLUMN "external_id" TO "externalId"`,
    );

    // api_consumers
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "added_at" TO "addedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "consumer_team_id" TO "consumerTeamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "consumer_component_id" TO "consumerComponentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_consumers" RENAME COLUMN "api_spec_id" TO "apiSpecId"`,
    );

    // api_specs
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "sunset_at" TO "sunsetAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "deprecated_at" TO "deprecatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // component_elasticsearch_indices
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "es_url" TO "esUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "index_pattern" TO "indexPattern"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // iac_module_drifts
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "detected_at" TO "detectedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "versions_behind" TO "versionsBehind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "latest_ref" TO "latestRef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "current_ref" TO "currentRef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "source_url" TO "sourceUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "module_name" TO "moduleName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_drifts" RENAME COLUMN "stack_path" TO "stackPath"`,
    );

    // iac_resource_dependencies
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "target_address" TO "targetAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "source_address" TO "sourceAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resource_dependencies" RENAME COLUMN "stack_id" TO "stackId"`,
    );

    // iac_resources
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "resource_name" TO "resourceName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "resource_type" TO "resourceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_resources" RENAME COLUMN "stack_id" TO "stackId"`,
    );

    // iac_module_versions
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "synced_at" TO "syncedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "outputs_meta" TO "outputsMeta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "variables_meta" TO "variablesMeta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_module_versions" RENAME COLUMN "module_id" TO "moduleId"`,
    );

    // iac_modules
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "latest_version" TO "latestVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_modules" RENAME COLUMN "source_repo_url" TO "sourceRepoUrl"`,
    );

    // iac_runs
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "duration_ms" TO "durationMs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "finished_at" TO "finishedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "started_at" TO "startedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "pipeline_url" TO "pipelineUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "triggered_by" TO "triggeredBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "resource_changes" TO "resourceChanges"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_runs" RENAME COLUMN "stack_id" TO "stackId"`,
    );

    // iac_stacks
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "auto_imported" TO "autoImported"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "external_tool_url" TO "externalToolUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "base_path" TO "basePath"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "repository_url" TO "repositoryUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "iac_stacks" RENAME COLUMN "component_id" TO "componentId"`,
    );

    // dashboard_widgets
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "grid_h" TO "gridH"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "grid_w" TO "gridW"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "grid_y" TO "gridY"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "grid_x" TO "gridX"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" RENAME COLUMN "dashboard_id" TO "dashboardId"`,
    );

    // dashboards
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboards" RENAME COLUMN "owner_id" TO "ownerId"`,
    );

    // audit_logs
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "actor_username" TO "actorUsername"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "actor_id" TO "actorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "resource_id" TO "resourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "resource_type" TO "resourceType"`,
    );

    // team_members
    await queryRunner.query(
      `ALTER TABLE "team_members" RENAME COLUMN "user_id" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" RENAME COLUMN "team_id" TO "teamId"`,
    );
    // incident_environments
    await queryRunner.query(
      `ALTER TABLE "incident_environments" RENAME COLUMN "environments_id" TO "environmentsId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_environments" RENAME COLUMN "incidents_id" TO "incidentsId"`,
    );
    // incident_components
    await queryRunner.query(
      `ALTER TABLE "incident_components" RENAME COLUMN "components_id" TO "componentsId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_components" RENAME COLUMN "incidents_id" TO "incidentsId"`,
    );

    // teams
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "external_id" TO "externalId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "slack_channel" TO "slackChannel"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "contact_email" TO "contactEmail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" RENAME COLUMN "display_name" TO "displayName"`,
    );

    // post_mortems
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "approved_at" TO "approvedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "approved_by" TO "approvedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "action_items" TO "actionItems"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "contributing_factors" TO "contributingFactors"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "root_cause" TO "rootCause"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_mortems" RENAME COLUMN "incident_id" TO "incidentId"`,
    );

    // incident_updates
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "new_status" TO "newStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "previous_status" TO "previousStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "author_id" TO "authorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incident_updates" RENAME COLUMN "incident_id" TO "incidentId"`,
    );

    // incidents
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "resolved_at" TO "resolvedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" RENAME COLUMN "commander_user_id" TO "commanderUserId"`,
    );

    // deployments
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "finished_at" TO "finishedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "started_at" TO "startedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "environment_id" TO "environmentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "component_id" TO "componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "commit_sha" TO "commitSha"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" RENAME COLUMN "deployed_by" TO "deployedBy"`,
    );

    // environments
    await queryRunner.query(
      `ALTER TABLE "environments" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" RENAME COLUMN "organization_id" TO "organizationId"`,
    );

    // components
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "cost_budget_usd" TO "costBudgetUsd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "container_image" TO "containerImage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "helm_chart" TO "helmChart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "argocd_app" TO "argocdApp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" RENAME COLUMN "team_id" TO "teamId"`,
    );

    // org_invitations
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "invited_by_user_id" TO "invitedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "expires_at" TO "expiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "token_hash" TO "tokenHash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_invitations" RENAME COLUMN "organization_id" TO "organizationId"`,
    );

    // user_organizations
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" RENAME COLUMN "user_id" TO "userId"`,
    );

    // organizations
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" RENAME COLUMN "owner_id" TO "ownerId"`,
    );

    // users
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "last_login" TO "lastLogin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "oauth_provider_id" TO "oauthProviderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "oauth_provider" TO "oauthProvider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "refresh_token" TO "refreshToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "last_name" TO "lastName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "first_name" TO "firstName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "display_name" TO "displayName"`,
    );

    // pipeline_runs
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "stage_results" TO "stageResults"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "duration_ms" TO "durationMs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "finished_at" TO "finishedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "started_at" TO "startedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "triggered_by" TO "triggeredBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" RENAME COLUMN "pipeline_id" TO "pipelineId"`,
    );

    // pipelines
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "created_by" TO "createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" RENAME COLUMN "organization_id" TO "organizationId"`,
    );
  }
}
