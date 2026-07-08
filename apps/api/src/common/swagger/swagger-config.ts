import { createRequire } from "module";

import { DocumentBuilder, OpenAPIObject } from "@nestjs/swagger";

const _require =
  typeof __filename !== "undefined"
    ? createRequire(__filename)
    : createRequire(eval("import.meta.url"));
const { version } = _require("../../../package.json") as {
  version: string;
};

export function createSwaggerConfig(): Omit<OpenAPIObject, "paths"> {
  return new DocumentBuilder()
    .setTitle("Farm API")
    .setDescription("The Farm platform API documentation")
    .setVersion(version)
    .addServer("/api/v1", "Versioned API (current)")
    .addServer("/api", "Deprecated alias (redirects to /api/v1)")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", in: "header", name: "x-ingest-token" },
      "IacIngestToken",
    )
    .addTag("Health", "Application health and readiness probes")
    .addTag("Authentication", "JWT auth, registration, and profile management")
    .addTag("User Management", "Platform-wide user management dashboard")
    .addTag("Organizations", "Organization and multi-tenant management")
    .addTag("Invitations", "Organization invitation workflows")
    .addTag("Catalog", "Software component registry")
    .addTag("Teams", "Team management and membership")
    .addTag("Environments", "Deployment environment management")
    .addTag("Deployments", "Component deployment tracking")
    .addTag("Pipelines", "CI/CD pipeline definitions and run history")
    .addTag("IaC", "Infrastructure-as-Code stack management and ingest")
    .addTag("IaC Modules", "IaC module catalog and versioning")
    .addTag(
      "Kubernetes",
      "Kubernetes cluster discovery and workload management",
    )
    .addTag("Helm", "Helm release discovery and synchronization")
    .addTag("Istio", "Istio service mesh integration")
    .addTag("Linkerd", "Linkerd 2.x service mesh integration")
    .addTag("Gateway", "API gateway route discovery and health checks")
    .addTag("Registry", "Container registry queries and vulnerability scanning")
    .addTag("Scorecards", "Component maturity scorecard evaluation")
    .addTag("SLOs", "Service Level Objective management")
    .addTag("Incidents", "Production incident management")
    .addTag("Post-Mortems", "Incident post-mortem analysis")
    .addTag("Alerting Rules", "PromQL-based alerting rule management")
    .addTag("Analytics", "Catalog health, DORA metrics, and usage reports")
    .addTag("Cloud", "Cloud resource discovery and cost management")
    .addTag("Dashboards", "Custom dashboard and widget management")
    .addTag("Documentation", "Technical documentation management")
    .addTag("Service Templates", "Service template and scaffold workflows")
    .addTag("OPA", "Open Policy Agent integration")
    .addTag("Observability", "Application observability and metrics")
    .addTag("Queues", "BullMQ queue monitoring and job management")
    .addTag("Webhooks", "Inbound CI/CD webhook receivers")
    .addTag("ArgoCD", "ArgoCD application management")
    .addTag("CircleCI", "CircleCI pipeline management")
    .addTag("Jenkins", "Jenkins job and build management")
    .addTag("Travis CI", "Travis CI build management")
    .addTag("Integrations", "CI/CD integration management")
    .addTag(
      "Integration Credentials",
      "Encrypted integration credential management",
    )
    .addTag("Tag Policies", "Cloud resource tag governance")
    .addTag("Elasticsearch Indices", "Elasticsearch index pattern management")
    .addTag("Plugins", "Plugin manager and registry")
    .addTag("Audit Log", "Immutable audit trail")
    .addTag("Features", "Platform feature availability flags")
    .addTag("Search", "Full-text and faceted search across catalog entities")
    .addTag("Setup", "Admin setup checklist")
    .addTag("FinOps", "Cost allocation and cloud spend management")
    .addTag(
      "Environment Requests",
      "Developer self-service environment requests",
    )
    .addTag("Traces", "OTLP trace ingestion")
    .build();
}
