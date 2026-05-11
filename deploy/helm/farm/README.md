# Farm Helm Chart

Deploy Farm (API + Web) on Kubernetes using Helm.

## Prerequisites

- Helm 3.10+
- Kubernetes 1.26+
- (Optional) Bitnami Helm repository for bundled PostgreSQL/Redis
- (Optional) Prometheus Operator for ServiceMonitor/PrometheusRule
- (Optional) Grafana with dashboard sidecar (label `grafana_dashboard: "1"`)

## Quick Start — Development

Install with bundled PostgreSQL and Redis (not production-safe):

```bash
cd deploy/helm/farm

# Fetch subchart dependencies
helm dependency update

# Install using the dev values profile
helm install farm . -f values-dev.yaml --namespace farm --create-namespace
```

Access the services:

```bash
# API
kubectl port-forward svc/farm-api 3000:3000 -n farm

# Web
kubectl port-forward svc/farm-web 3001:3001 -n farm
```

## Quick Start — Production

1. Create the application secret:

```bash
kubectl create namespace farm

kubectl create secret generic farm-api -n farm \
  --from-literal=JWT_SECRET="<min 32 chars>" \
  --from-literal=DATABASE_PASSWORD="<password>" \
  --from-literal=REDIS_PASSWORD="<password>"
```

2. Copy and edit the production values:

```bash
cp values-production.yaml my-values.yaml
# Edit: image tags, hostnames, existingSecret name, observability URLs
```

3. Install:

```bash
helm dependency update
helm install farm . -f my-values.yaml -n farm --create-namespace
```

4. Upgrade after a new release:

```bash
helm upgrade farm . -f my-values.yaml -n farm
```

## Database Migrations

Migrations run automatically as a Kubernetes Job before every install and
upgrade (Helm hook `pre-install,pre-upgrade`). The Job uses the API image and
runs `npm run migration:run -w apps/api`. It is deleted on success.

Disable with:

```yaml
migration:
  enabled: false
```

## Secrets Management

The recommended production pattern uses `existingSecret`:

```yaml
api:
  existingSecret: farm-api
```

When `existingSecret` is set the chart does not create a Secret object. The
named secret is mounted directly in the Deployment and the migration Job via
`envFrom`. Use External Secrets Operator, Sealed Secrets, or Vault Agent to
populate the secret.

Required keys in the external secret:

| Key | Description |
|-----|-------------|
| `JWT_SECRET` | HS256 signing key, min 32 chars |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `REDIS_PASSWORD` | Redis password (if auth enabled) |

Optional keys:

`SMTP_PASS`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`,
`KEYCLOAK_CLIENT_SECRET`, `LDAP_BIND_PASSWORD`, `IAC_INGEST_TOKEN`,
`SWAGGER_PASSWORD`

## Observability Integration

Farm exposes Prometheus metrics at `/api/metrics`. The chart ships three
optional Kubernetes-native resources for observability integration:

### ServiceMonitor (Prometheus Operator)

```yaml
serviceMonitor:
  enabled: true
  additionalLabels:
    release: kube-prometheus-stack   # must match your Prometheus selector
```

### PrometheusRule

Alert rules and recording rules for Farm API:

```yaml
prometheusRule:
  enabled: true
  additionalLabels:
    release: kube-prometheus-stack
```

### Grafana Dashboards

Six dashboard ConfigMaps with the `grafana_dashboard: "1"` label for
automatic sidecar import:

```yaml
grafanaDashboards:
  enabled: true
  folderLabel: farm   # Grafana folder name
```

Dashboards: `farm-api`, `farm-infra`, `farm-logs`, `farm-rum`, `farm-slo`,
`farm-traces`.

### OpenTelemetry and Pyroscope

Configure OTEL tracing and Pyroscope profiling via the `api.observability` block:

```yaml
api:
  observability:
    otelEnabled: true
    otelExporterEndpoint: http://alloy.monitoring.svc.cluster.local:4318
    pyroscopeEnabled: true
    pyroscopeServerAddress: http://pyroscope.monitoring.svc.cluster.local:4040
```

## Parameters

### Global

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageRegistry` | Global image registry prefix | `""` |
| `global.imagePullSecrets` | Global pull secret names | `[]` |
| `nameOverride` | Override chart name | `""` |
| `fullnameOverride` | Override release-scoped name | `""` |

### API

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.replicaCount` | Desired pod replicas | `1` |
| `api.image.repository` | Image repository | `farm-api` |
| `api.image.tag` | Image tag (defaults to Chart.AppVersion) | `""` |
| `api.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `api.existingSecret` | External secret name (skips Secret creation) | `""` |
| `api.env.*` | Non-sensitive environment variables | see values.yaml |
| `api.secrets.*` | Sensitive env vars (only used if no existingSecret) | `""` |
| `api.observability.*` | OTEL/Pyroscope/backend URL configuration | see values.yaml |
| `api.resources` | CPU/memory requests and limits | see values.yaml |
| `api.autoscaling.enabled` | Enable HPA | `false` |
| `api.podDisruptionBudget.enabled` | Enable PDB | `false` |

### Web

| Parameter | Description | Default |
|-----------|-------------|---------|
| `web.replicaCount` | Desired pod replicas | `1` |
| `web.image.repository` | Image repository | `farm-web` |
| `web.env.NEXT_PUBLIC_API_URL` | Public API base URL | `http://localhost:3000/api` |
| `web.env.NEXT_PUBLIC_APP_URL` | Public app base URL | `http://localhost:3001` |
| `web.env.API_INTERNAL_URL` | Internal API URL (auto-resolved if empty) | `""` |

### Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.annotations` | Additional annotations | `{}` |
| `ingress.api.hostname` | Hostname for the API Ingress rule | `""` |
| `ingress.web.hostname` | Hostname for the Web Ingress rule | `""` |
| `ingress.tls` | TLS configuration array | `[]` |

### External Database

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalDatabase.host` | PostgreSQL host | `""` |
| `externalDatabase.port` | PostgreSQL port | `5432` |
| `externalDatabase.user` | PostgreSQL user | `farm` |
| `externalDatabase.name` | PostgreSQL database name | `farm` |
| `externalDatabase.password` | Password (prefer existingSecret) | `""` |

### Redis

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalRedis.host` | Redis host | `""` |
| `externalRedis.port` | Redis port | `6379` |
| `externalRedis.password` | Redis password | `""` |

### Bundled PostgreSQL (Bitnami)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Deploy bundled PostgreSQL | `false` |
| `postgresql.auth.username` | Database user | `farm` |
| `postgresql.auth.password` | Database password | `""` |
| `postgresql.auth.database` | Database name | `farm` |

### Bundled Redis (Bitnami)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Deploy bundled Redis | `false` |
| `redis.auth.enabled` | Enable Redis auth | `false` |

## Upgrade Notes

- Migrations run automatically on every `helm upgrade`. If you want to skip
  migrations for a specific upgrade, set `--set migration.enabled=false`.
- The `checksum/config` and `checksum/secret` pod annotations force a rolling
  restart whenever ConfigMap or Secret content changes.
- PDB `minAvailable: 1` is only meaningful with 2+ replicas. Enable PDB only
  when `replicaCount >= 2`.
