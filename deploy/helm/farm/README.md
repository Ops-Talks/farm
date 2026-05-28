# Farm Helm Chart

Deploy Farm (API + Web) on Kubernetes using Helm.

## Image Provenance and Signing

Farm publishes signed, multi-arch container images to GitHub Container Registry
on every release:

| Image | Registry reference | Architectures |
|-------|--------------------|---------------|
| API   | `ghcr.io/ops-talks/farm-api` | `linux/amd64`, `linux/arm64` |
| Web   | `ghcr.io/ops-talks/farm-web` | `linux/amd64`, `linux/arm64` |

Each pushed manifest is signed with [cosign](https://github.com/sigstore/cosign)
using **Sigstore keyless** signing (Fulcio short-lived certificates + Rekor
transparency log). There is no public key to distribute or rotate — verification
is performed against the Sigstore public good trust root using the GitHub
Actions OIDC identity that produced the signature.

In addition, every release build attaches:

- An **SLSA v1.0 provenance attestation** (`provenance: mode=max`) describing
  the build invocation, source revision, and builder identity, per platform.
- An **SPDX SBOM attestation** (`sbom: true`) listing every package in the
  final image, per platform.
- A stand-alone **SPDX SBOM file** uploaded as an asset on the GitHub Release
  (`farm-api-sbom.spdx.json`, `farm-web-sbom.spdx.json`) for consumers without
  cosign/oras tooling.

### Verify the cosign signature

```bash
COSIGN_EXPERIMENTAL=1 cosign verify \
  --certificate-identity-regexp "^https://github.com/Ops-Talks/farm/" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/ops-talks/farm-api:<TAG>
```

Replace `<TAG>` with the semver version you are deploying (for example
`1.2.3`). The same command works for `farm-web` — swap the image name.

A successful verification prints the signature certificate subject (the
`release.yml` workflow ref) and the Rekor transparency log index, and exits 0.
Any tampering with the manifest, or a signature produced by a different
workflow/identity, exits non-zero.

### Verify the SBOM attestation

```bash
COSIGN_EXPERIMENTAL=1 cosign verify-attestation \
  --type spdxjson \
  --certificate-identity-regexp "^https://github.com/Ops-Talks/farm/" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/ops-talks/farm-api:<TAG>
```

To verify the SLSA provenance attestation, swap `--type spdxjson` for
`--type slsaprovenance1`.

### Trust root

Farm relies on the [Sigstore public good](https://docs.sigstore.dev/system_config/public_deployment/)
instance:

- **Certificate authority**: Fulcio (`https://fulcio.sigstore.dev`)
- **Transparency log**: Rekor (`https://rekor.sigstore.dev`)
- **OIDC issuer**: `https://token.actions.githubusercontent.com`

No long-lived signing key is held by the Farm project; signatures are bound to
the immutable GitHub Actions workflow run that produced them. This means
rotating "the key" is a no-op — every signature is already short-lived and
publicly audited via Rekor.

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

2. Create a custom values file:

```bash
cp values.yaml my-values.yaml
# Edit: image tags, existingSecret name, external database/redis, observability URLs
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
  folder: Farm   # Grafana folder name
```

Dashboards: `farm-api`, `farm-infra`, `farm-logs`, `farm-rum`, `farm-slo`,
`farm-traces`.

### OpenTelemetry, Pyroscope, and Faro

Each observability integration is an independent feature flag (disabled by
default). Activate only the components present in your cluster.

**OpenTelemetry tracing** (requires Grafana Alloy or any OTLP collector):

```yaml
tracing:
  enabled: true
  endpoint: http://alloy.monitoring.svc.cluster.local:4318/v1/traces
  serviceName: farm-api
```

**Pyroscope continuous profiling** (requires Grafana Pyroscope or Grafana Cloud
Profiles):

```yaml
pyroscope:
  enabled: true
  url: http://pyroscope.monitoring.svc.cluster.local:4040
```

When `pyroscope.enabled: true`, the chart automatically adds Pyroscope
auto-discovery annotations to the API pod:

```
profiles.grafana.com/cpu.scrape: "true"
profiles.grafana.com/memory.scrape: "true"
profiles.grafana.com/service_name: <release>-api
```

These annotations are consumed by the Pyroscope Operator or by Grafana Alloy
with a `pyroscope.scrape` component (Alloy v1.0+).

**Grafana Faro RUM** (requires Grafana Alloy with `faro.receiver`, or Grafana
Cloud Frontend Observability):

```yaml
faro:
  enabled: true
  url: http://alloy.monitoring.svc.cluster.local:12347/collect
```

`NEXT_PUBLIC_FARO_URL` is injected into the web pod ConfigMap and picked up by
the `@grafana/faro-web-sdk` integration in the Next.js frontend.

### Observability Integrations

#### Tracing (OpenTelemetry)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `tracing.enabled` | Enable OTLP trace export from the API | `false` |
| `tracing.endpoint` | OTLP HTTP collector endpoint | `""` |
| `tracing.serviceName` | Service name reported in traces | `farm-api` |

#### Pyroscope (Continuous Profiling)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `pyroscope.enabled` | Enable continuous profiling; also adds pod auto-discovery annotations | `false` |
| `pyroscope.url` | Pyroscope server address | `""` |

#### Faro (Real User Monitoring)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `faro.enabled` | Enable Faro RUM; injects `NEXT_PUBLIC_FARO_URL` into the web pod | `false` |
| `faro.url` | Faro collector URL | `""` |

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
| `api.image.repository` | Image repository | `ops-talks/farm-api` |
| `api.image.tag` | Image tag (defaults to Chart.AppVersion) | `""` |
| `api.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `api.existingSecret` | External secret name (skips Secret creation) | `""` |
| `api.env.*` | Non-sensitive environment variables | see values.yaml |
| `api.env.THROTTLE_TTL` | Throttle window in milliseconds | `"60000"` |
| `api.env.THROTTLE_LIMIT` | Maximum requests per throttle window | `"10"` |
| `api.env.LOG_LEVEL` | Application log level | `"info"` |
| `api.env.DATABASE_POOL_SIZE` | TypeORM connection pool size | `"10"` |
| `api.secrets.*` | Sensitive env vars (only used if no existingSecret) | `""` |
| `api.resources` | CPU/memory requests and limits | see values.yaml |
| `api.startupProbe` | Startup probe (httpGet /api/health, failureThreshold 20, periodSeconds 5) | see values.yaml |
| `api.autoscaling.enabled` | Enable HPA | `false` |
| `api.autoscaling.behavior` | HPA scale behavior (scale-down 300s / scale-up 60s) | see values.yaml |
| `api.podDisruptionBudget.enabled` | Enable PDB (only meaningful with replicaCount >= 2) | `false` |
| `api.topologySpreadConstraints` | Pod topology spread constraints (e.g. zone distribution) | `[]` |
| `api.networkPolicy.enabled` | Enable NetworkPolicy for the API pod | `false` |

### Web

| Parameter | Description | Default |
|-----------|-------------|---------|
| `web.replicaCount` | Desired pod replicas | `1` |
| `web.image.repository` | Image repository | `ops-talks/farm-web` |
| `web.env.NEXT_PUBLIC_API_URL` | Public API base URL | `""` |
| `web.env.NEXT_PUBLIC_WS_URL` | WebSocket URL for the browser | `""` |
| `web.env.API_INTERNAL_URL` | Internal API URL (auto-resolved if empty) | `""` |
| `web.startupProbe` | Startup probe (httpGet /api/health port 3001, failureThreshold 20, periodSeconds 5) | see values.yaml |
| `web.autoscaling.behavior` | HPA scale behavior (scale-down 300s / scale-up 60s) | see values.yaml |
| `web.topologySpreadConstraints` | Pod topology spread constraints (e.g. zone distribution) | `[]` |
| `web.networkPolicy.enabled` | Enable NetworkPolicy for the web pod | `false` |

### Migration Job

| Parameter | Description | Default |
|-----------|-------------|---------|
| `migration.enabled` | Run migration Job as pre-install/pre-upgrade hook | `true` |
| `migration.activeDeadlineSeconds` | Maximum Job duration before termination | `300` |
| `migration.backoffLimit` | Job retry limit before failure | `3` |

### PrometheusRule

| Parameter | Description | Default |
|-----------|-------------|---------|
| `prometheusRule.enabled` | Create PrometheusRule | `false` |
| `prometheusRule.runbookBaseUrl` | Base URL for alert runbooks (appended with #alert-name-slug) | GitHub README anchor |

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
