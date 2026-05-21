# API Reference

This section provides detailed reference documentation for all Farm API endpoints.

## Overview

Farm exposes a REST API for managing the portal. All endpoints are prefixed with `/api`.

## Base URL

```
http://localhost:3000/api
```

## Interactive Documentation

Farm provides an interactive API documentation interface using Swagger UI. This allows you to explore endpoints, view request/response schemas, and test API calls directly from your browser.

**Swagger UI Endpoint**: `http://localhost:3000/api/docs`

Access requires HTTP Basic Auth credentials. The defaults for local development are `farm` / `farm`. Set `SWAGGER_USER` and `SWAGGER_PASSWORD` environment variables to change them in production.

## Authentication

All endpoints are protected with JWT-based authentication. Include a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

Mutation endpoints (POST, PATCH, DELETE) require the `admin` role.

## Available APIs

| API | Base Path | Description |
|-----|-----------|-------------|
| [Health](health.md) | `/api/health` | Health check endpoints |
| [Auth](auth.md) | `/api/v1/auth` | User registration, login, token refresh, OAuth |
| [Catalog](catalog.md) | `/api/v1/catalog` | Software component catalog |
| [API Management](api-management.md) | `/api/v1/catalog/components/:id/api-specs`, `/api/v1/api-specs` | API specification lifecycle, diff, and consumer tracking |
| [API Gateway](api-gateway.md) | `/api/v1/gateway` | Kong and AWS API Gateway route discovery and health |
| [Documentation](docs.md) | `/api/v1/docs` | Technical documentation |
| [Environments](environments.md) | `/api/v1/environments` | Deployment environments |
| [Deployments](deployments.md) | `/api/v1/deployments` | Component deployment tracking |
| [Teams](teams.md) | `/api/v1/teams` | Team ownership and membership |
| [Organizations](organizations.md) | `/api/v1/organizations` | Organization and member management |
| [Plugins](plugins.md) | `/api/v1/plugins` | Plugin registry |
| [Audit Log](audit-log.md) | `/api/v1/audit-logs` | Immutable audit trail for system actions |
| [Alerting Rules](observability.md) | `/api/v1/alerting-rules` | PromQL-based alerting rules linked to components or environments |
| [Analytics](analytics.md) | `/api/v1/analytics` | Catalog health, DORA metrics, usage reports |
| [Observability](observability.md) | `/api/v1/observability` | Prometheus, Jaeger, and Loki proxy endpoints |
| [Helm](helm.md) | `/api/v1/helm` | Helm release discovery and sync |
| [Kubernetes](kubernetes.md) | `/api/v1/kubernetes` | Kubernetes workload, CRD, and Rollout discovery |
| [Pipelines](pipelines.md) | `/api/v1/pipelines` | Multi-stage pipeline definition, execution, and log streaming |
| [CI/CD Integrations](cicd.md) | `/api/v1/argocd`, `/api/v1/circleci`, `/api/v1/jenkins`, `/api/v1/travisci` | External CI/CD platform integrations |
| [Cloud Integrations](cloud.md) | `/api/v1/cloud` | AWS, GCP, Azure resource discovery and cost |
| [Tag Governance](tag-governance.md) | `/api/v1/tag-policies`, `/api/v1/violations` | Tag policy CRUD, compliance audit, ClusterPolicy export |
| [Kyverno](kyverno.md) | `/api/v1/kubernetes/policy-reports`, `/api/v1/kubernetes/cluster-policy-reports` | PolicyReport reader and ClusterPolicy YAML export |
| [Keycloak SSO](keycloak-sso.md) | `/api/v1/auth/keycloak`, `/api/v1/keycloak-sync` | OIDC login and group sync |
| [Istio](istio.md) | `/api/v1/istio` | VirtualService, PeerAuthentication, traffic metrics |
| [Linkerd](linkerd.md) | `/api/v1/linkerd` | Linkerd 2.x service mesh metrics, security posture, and topology |
| [OPA](opa.md) | `/api/v1/opa` | Open Policy Agent policy evaluation and result persistence |
| [Container Registry](registry.md) | `/api/v1/registry` | Repository browsing, image manifests, and vulnerability scanning |
| [Search](search.md) | `/api/v1/search` | Quick search across catalog entities |
| [FinOps](finops.md) | `/api/v1/cost` | Infrastructure cost data from OpenCost |
| [SLOs](slos.md) | `/api/v1/slos` | Service Level Objectives and error budget tracking |
| [Incidents](incidents.md) | `/api/v1/incidents` | Incident lifecycle, timeline, and post-mortem |
| [Dashboards](dashboards.md) | `/api/v1/dashboards` | Custom dashboard builder with widgets |
| [Service Templates](service-templates.md) | `/api/v1/service-templates` | Golden path templates and service scaffolding |
| [Environment Requests](environment-requests.md) | `/api/v1/environment-requests` | Self-service environment provisioning with approval workflow |
| [IaC](iac.md) | `/api/v1/iac` | IaC stack ingestion, run tracking, drift detection, and dashboard |
| [IaC Modules](iac-modules.md) | `/api/v1/iac-modules` | IaC module catalog with versioning and component linking |
| [Elasticsearch Indices](elasticsearch-indices.md) | `/api/v1/components/:id/elasticsearch-indices`, `/api/v1/elasticsearch/indices` | Component-scoped index linking, live stats, and admin overview |
| [User Management](user-management.md) | `/api/v1/users` | User listing, role assignment, and profile management |
| [Invitations](invitations.md) | `/api/v1/invitations` | Organization invitation tokens and acceptance flow |

## Response Format

All responses are JSON formatted. Successful responses include the requested data, while error responses follow a standard format:

```json
{
  "statusCode": 404,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/catalog/components/abc",
  "message": "Component with ID \"abc\" not found"
}
```

## Rate Limiting

Rate limiting is enforced globally via the `@nestjs/throttler` module. Authentication endpoints have stricter per-endpoint limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/v1/auth/login` | 5 requests | 1 minute |
| `POST /api/v1/auth/register` | 5 requests | 1 minute |
| `POST /api/v1/auth/refresh` | 10 requests | 1 minute |
| All other endpoints | Configurable via `THROTTLE_LIMIT` | Configurable via `THROTTLE_TTL` |

When the rate limit is exceeded, the API returns `429 Too Many Requests`.

## Versioning

The API uses URI-based versioning. All resource endpoints are prefixed with `/api/v1/`. Infrastructure endpoints (`/api/health`, `/api/metrics`, `/api/docs`) remain version-neutral and do not include a version prefix.

## OpenAPI Specification

The full machine-readable OpenAPI 3.0 specification is available at:

- **Live (requires running server):** `/api/docs-json`
- **Static snapshot:** `apps/api/openapi.json` in the repository (placeholder; a real snapshot is generated by CI from `/api/docs-json`)

The spec is also browsable via Swagger UI at `/api/docs` (HTTP Basic Auth protected; default credentials `farm`/`farm` are for **local/dev use only** — set `SWAGGER_USER` and `SWAGGER_PASSWORD` env vars to override in production).

