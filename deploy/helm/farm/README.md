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
- (Optional) A CNI plugin that enforces NetworkPolicy (Calico, Cilium, Canal, or Weave Net)
  if `api.networkPolicy.enabled: true` or `web.networkPolicy.enabled: true`.
  **Flannel silently ignores NetworkPolicy resources** without returning an error, creating
  a false sense of security. Set `cniConfirmed: true` alongside `enabled: true` after you
  have verified your CNI supports enforcement.
- (Optional) Bitnami Helm repository for bundled PostgreSQL/Redis
- (Optional) Prometheus Operator for ServiceMonitor/PrometheusRule
- (Optional) Grafana with dashboard sidecar (label `grafana_dashboard: "1"`)
- (Optional) External Secrets Operator for `api.externalSecret.enabled: true`
  (see https://external-secrets.io)

## Registry Mirrors

Bitnami images used by the bundled PostgreSQL and Redis subcharts are published on
**Docker Hub** (`docker.io/bitnami/*`). Docker Hub rate-limits unauthenticated pulls
(100 pulls per 6 hours per IP for anonymous clients). This can cause `ImagePullBackOff`
errors in CI or shared-node environments.

**Options:**

1. **Docker Hub credentials** — add a pull secret with your Docker Hub account and
   reference it via `global.imagePullSecrets`.

2. **Registry mirror** — set the Bitnami image registry to a pre-populated mirror:

   ```yaml
   # ECR Public mirror (no auth required for public images):
   postgresql:
     global:
       imageRegistry: public.ecr.aws/bitnami

   redis:
     global:
       imageRegistry: public.ecr.aws/bitnami
   ```

   Other common mirrors:
   - `harbor.corp.example.com/bitnami-mirror` (corporate Harbor)
   - A custom mirror populated via `crane copy docker.io/bitnami/... <mirror>/...`

3. **External managed services** — the recommended production approach. Disable the
   bundled subcharts (`postgresql.enabled: false`, `redis.enabled: false`) and point
   `externalDatabase` and `externalRedis` at managed RDS/ElastiCache instances. This
   avoids the Docker Hub dependency entirely.

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

2. Create your values file in your own GitOps repository (do not commit it to
   the Farm chart directory):

```yaml
# my-farm-values.yaml  — lives in YOUR GitOps repo, never inside the chart

api:
  replicaCount: 2
  image:
    registry: ghcr.io
    repository: ops-talks/farm-api
  existingSecret: farm-api
  env:
    NODE_ENV: production
    DATABASE_SYNC: "false"
    ALLOWED_ORIGINS: "https://api.example.com"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

web:
  replicaCount: 2
  image:
    registry: ghcr.io
    repository: ops-talks/farm-web
  env:
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: "https://api.example.com/api"
    NEXT_PUBLIC_WS_URL: "wss://api.example.com/events"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

ingress:
  enabled: true
  className: ""   # set to your controller class: nginx, traefik, alb, kong, etc.
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Add WebSocket timeout annotations for your ingress controller here.
    # See the "Ingress" section below for per-controller examples.
  api:
    hostname: api.example.com
  web:
    hostname: app.example.com
  tls:
    - secretName: farm-api-tls
      hosts: [api.example.com]
    - secretName: farm-web-tls
      hosts: [app.example.com]

externalDatabase:
  host: "<postgres-host>"
  port: 5432
  user: farm
  name: farm
  existingSecret: farm-api

externalRedis:
  host: "<redis-host>"
  port: 6379
  existingSecret: farm-api
```

3. Install:

```bash
helm dependency update
helm install farm . -f my-farm-values.yaml -n farm --create-namespace
```

4. Upgrade after a new release:

```bash
helm upgrade farm . -f my-values.yaml -n farm
```

## Database Migrations

Migrations run automatically as a Kubernetes Job on every install and upgrade.
The hook timing differs by operation:

- **Fresh install** (`helm install`): the migration Job runs as a `post-install`
  hook — after all chart resources (Deployments, Services, ConfigMaps) are
  created. The database must be reachable before the migration pod starts.
- **Upgrade** (`helm upgrade`): the migration Job runs as a `pre-upgrade` hook
  — before new application pods roll out. If the migration fails the upgrade is
  blocked and you must roll back manually. The Job is deleted on success.

Disable with:

```yaml
migration:
  enabled: false
```

## Secret Management

Farm supports three tiers of secret management. Choose the one that matches
your security posture.

### Option A — existingSecret (bring your own Secret)

Create a Kubernetes Secret manually (or via your GitOps toolchain) and
reference it by name:

```bash
kubectl create secret generic farm-api -n farm \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=DATABASE_PASSWORD="<password>" \
  --from-literal=REDIS_PASSWORD="<password>"
```

```yaml
api:
  existingSecret: farm-api
```

When `existingSecret` is set the chart does not create a Secret object. The
named secret is mounted directly in the Deployment and the migration Job via
`envFrom`.

Required keys in the external secret:

| Key | Description |
|-----|-------------|
| `JWT_SECRET` | HS256 signing key, min 32 chars |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `REDIS_PASSWORD` | Redis password (if auth enabled) |

Optional keys: `SMTP_PASS`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`,
`KEYCLOAK_CLIENT_SECRET`, `LDAP_BIND_PASSWORD`, `IAC_INGEST_TOKEN`,
`SWAGGER_PASSWORD`

> **Warning**: `helm get values farm --all` exposes any secret passed via
> `--set` in plain text from the release history. Always use `existingSecret`
> or ESO in production — never `--set api.secrets.JWT_SECRET=...`.

### Option B — External Secrets Operator (ESO)

Requires the [External Secrets Operator](https://external-secrets.io) to be
installed in the cluster:

```bash
helm install eso external-secrets/external-secrets \
  -n external-secrets --create-namespace
```

Enable and configure the ESO integration:

```yaml
api:
  externalSecret:
    enabled: true
    secretStoreRef:
      name: aws-secrets-manager   # your SecretStore or ClusterSecretStore name
      kind: ClusterSecretStore
    remoteRef:
      key: prod/farm/api-secrets  # key in the remote store
  existingSecret: farm-api        # must match the ExternalSecret target name
```

The chart renders an `ExternalSecret` resource that instructs the ESO
controller to pull `JWT_SECRET`, `DATABASE_PASSWORD`, and `REDIS_PASSWORD`
from the configured store and write them into a Kubernetes Secret named
`<release>-api`. See the "ESO examples" above for AWS Secrets Manager and
Vault configurations.

### Option C — Vault Agent Injector

No chart changes are needed. Add Vault Agent annotations to the API pod via
`api.podAnnotations`:

```yaml
api:
  podAnnotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "farm-api"
    vault.hashicorp.com/agent-inject-secret-farm: "secret/data/farm/production"
    vault.hashicorp.com/agent-inject-template-farm: |
      {{ with secret "secret/data/farm/production" -}}
      export JWT_SECRET="{{ .Data.data.JWT_SECRET }}"
      export DATABASE_PASSWORD="{{ .Data.data.DATABASE_PASSWORD }}"
      {{- end }}
```

The Vault Agent sidecar injects the rendered template as a file; configure the
application to source it at startup.

### JWT Secret Rotation

1. **Update the secret** in your secret store (Kubernetes Secret, ESO backend,
   or Vault path).

2. **Trigger a rolling restart**:

   ```bash
   kubectl rollout restart deployment/farm-api -n farm
   kubectl rollout status deployment/farm-api -n farm
   ```

3. **Access token impact**: all existing short-lived JWT access tokens become
   invalid immediately when each pod restarts. Users actively making requests
   will receive 401 errors until they exchange their refresh token.

4. **Refresh token impact**: refresh tokens are stored as bcrypt hashes in the
   PostgreSQL database. They remain valid and users can exchange them for new
   access tokens signed with the new key — this happens transparently in the
   browser for most users.

5. **Users without a valid refresh token** (e.g. their refresh token has
   expired) must log in again.

6. **Estimated impact window**: duration of the rolling restart — typically
   less than 30 seconds with 2 replicas and `maxUnavailable: 0`.


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

### OpenTelemetry and Pyroscope

Configure OTEL tracing and Pyroscope profiling via the `api.observability` block:

```yaml
api:
  observability:
    otelEnabled: true
    otelExporterEndpoint: http://alloy.monitoring.svc.cluster.local:4318/v1/traces
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
| `api.observability.*` | OTEL/Pyroscope/backend URL configuration | see values.yaml |
| `api.resources` | CPU/memory requests and limits | see values.yaml |
| `api.startupProbe` | Startup probe (httpGet /api/health, failureThreshold 20, periodSeconds 5) | see values.yaml |
| `api.autoscaling.enabled` | Enable HPA | `false` |
| `api.autoscaling.maxReplicas` | HPA maximum replicas (see connection pool note in values.yaml) | `3` |
| `api.autoscaling.behavior` | HPA scale behavior (scale-down 300s / scale-up 60s) | see values.yaml |
| `api.podDisruptionBudget.enabled` | Enable PDB (only meaningful with replicaCount >= 2) | `false` |
| `api.topologySpreadConstraints` | Pod topology spread constraints (e.g. zone distribution) | `[]` |
| `api.updateStrategy` | Deployment rolling update strategy | `{type: RollingUpdate, maxUnavailable: 0, maxSurge: 1}` |
| `api.minReadySeconds` | Minimum seconds a pod must be Ready before it receives traffic | `10` |
| `api.terminationGracePeriodSeconds` | Seconds to wait after SIGTERM before SIGKILL | `30` |
| `api.lifecycle.preStop` | preStop hook (default: `sleep 5` to drain kube-proxy) | see values.yaml |
| `api.networkPolicy.enabled` | Enable NetworkPolicy for the API pod | `false` |
| `api.networkPolicy.cniConfirmed` | Confirm CNI enforces NetworkPolicy (suppresses validation error) | `false` |
| `api.serviceAccount.automountServiceAccountToken` | Controls automountServiceAccountToken on the ServiceAccount | `false` |
| `api.serviceAccount.annotations` | Cloud workload identity annotations (IRSA, Workload Identity, Pod Identity) | `{}` |
| `api.existingSecret` | External secret name (skips Secret creation) | `""` |
| `api.externalSecret.enabled` | Render an ExternalSecret resource (requires ESO) | `false` |
| `api.externalSecret.secretStoreRef.name` | ESO SecretStore or ClusterSecretStore name | `""` |
| `api.externalSecret.remoteRef.key` | Key in the remote secret store | `""` |

### Web

| Parameter | Description | Default |
|-----------|-------------|---------|
| `web.replicaCount` | Desired pod replicas | `1` |
| `web.image.repository` | Image repository | `ops-talks/farm-web` |
| `web.env.NEXT_PUBLIC_WS_URL` | WebSocket URL for the browser | `""` |
| `web.startupProbe` | Startup probe (httpGet /api/health port 3001, failureThreshold 20, periodSeconds 5) | see values.yaml |
| `web.autoscaling.behavior` | HPA scale behavior (scale-down 300s / scale-up 60s) | see values.yaml |
| `web.topologySpreadConstraints` | Pod topology spread constraints (e.g. zone distribution) | `[]` |
| `web.updateStrategy` | Deployment rolling update strategy | `{type: RollingUpdate, maxUnavailable: 0, maxSurge: 1}` |
| `web.minReadySeconds` | Minimum seconds a pod must be Ready before it receives traffic | `10` |
| `web.terminationGracePeriodSeconds` | Seconds to wait after SIGTERM before SIGKILL | `30` |
| `web.lifecycle.preStop` | preStop hook (default: `sleep 5` to drain kube-proxy) | see values.yaml |
| `web.networkPolicy.enabled` | Enable NetworkPolicy for the web pod | `false` |
| `web.networkPolicy.cniConfirmed` | Confirm CNI enforces NetworkPolicy (suppresses validation error) | `false` |
| `web.serviceAccount.automountServiceAccountToken` | Controls automountServiceAccountToken on the ServiceAccount | `false` |
| `web.serviceAccount.annotations` | Cloud workload identity annotations (IRSA, Workload Identity, Pod Identity) | `{}` |

### Migration Job

| Parameter | Description | Default |
|-----------|-------------|---------|
| `migration.enabled` | Run migration Job as post-install/pre-upgrade hook | `true` |
| `migration.activeDeadlineSeconds` | Maximum Job duration before termination | `300` |
| `migration.backoffLimit` | Job retry limit before failure | `3` |
| `migration.preUpgradeCheck.enabled` | Run a DB reachability check before the migration (pre-upgrade only) | `false` |

### PrometheusRule

| Parameter | Description | Default |
|-----------|-------------|---------|
| `prometheusRule.enabled` | Create PrometheusRule | `false` |
| `prometheusRule.runbookBaseUrl` | Base URL for alert runbooks (appended with #alert-name-slug) | GitHub README anchor |

### Ingress

Farm ships with two separate Ingress resources — one for the API and one for the
web — both sharing a single hostname with path-based routing. This is the
Kubernetes-native pattern: the Ingress controller (NGINX, Traefik, etc.) routes
`/api` and `/admin` to the API service and `/` to the web service. The web app
uses relative URLs (`/api/v1/...`) so no rebuild is required between environments.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress | `false` |
| `ingress.className` | Ingress class name (e.g., `"nginx"`, `"traefik"`) | `""` |
| `ingress.hostname` | Shared hostname for both Ingress resources | `""` |
| `ingress.annotations` | Shared annotations applied to both Ingress resources | `{}` |
| `ingress.api.hostname` | Override hostname for the API Ingress (defaults to `ingress.hostname`) | `""` |
| `ingress.api.paths` | Paths routed to the API service | `[{path: /api}, {path: /admin}]` |
| `ingress.api.annotations` | Per-resource annotations for the API Ingress | `{}` |
| `ingress.web.hostname` | Override hostname for the web Ingress (defaults to `ingress.hostname`) | `""` |
| `ingress.web.paths` | Paths routed to the web service | `[{path: /}]` |
| `ingress.web.annotations` | Per-resource annotations for the web Ingress | `{}` |
| `ingress.tls` | TLS configuration array | `[]` |

**KinD / local development**: enable ingress-nginx (`make kind-deploy` handles this
automatically) and set `ingress.hostname: "farm.local"` in `values-dev.yaml`. Add
`127.0.0.1 farm.local` to `/etc/hosts`, then access the app at `http://farm.local`.

**Subdomain routing**: override `ingress.api.hostname` and `ingress.web.hostname`
individually when each service must live on its own subdomain.

#### WebSocket support

Farm uses WebSockets for real-time events (`NEXT_PUBLIC_WS_URL`). When running
behind NGINX Ingress Controller, increase the proxy timeout annotations to
prevent mid-session disconnects (NGINX defaults to 60 s for idle connections):

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
```

The operator is responsible for adding the appropriate annotations for their
ingress controller in their own values file. See the examples above.

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
| `postgresql.global.imageRegistry` | Registry mirror for Bitnami images (empty = Docker Hub) | `""` |
| `postgresql.auth.username` | Database user | `farm` |
| `postgresql.auth.password` | Database password | `""` |
| `postgresql.auth.database` | Database name | `farm` |
| `postgresql.primary.persistence.storageClass` | StorageClass for PostgreSQL PVC (empty = cluster default) | `""` |

### Bundled Redis (Bitnami)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Deploy bundled Redis | `false` |
| `redis.global.imageRegistry` | Registry mirror for Bitnami images (empty = Docker Hub) | `""` |
| `redis.auth.enabled` | Enable Redis auth | `false` |
| `redis.master.persistence.storageClass` | StorageClass for Redis PVC (empty = cluster default) | `""` |

## Upgrade Notes

- Migrations run automatically on every `helm upgrade`. If you want to skip
  migrations for a specific upgrade, set `--set migration.enabled=false`.
- The `checksum/config` and `checksum/secret` pod annotations force a rolling
  restart whenever ConfigMap or Secret content changes.
- PDB `minAvailable: 1` is only meaningful with 2+ replicas. Enable PDB only
  when `replicaCount >= 2`.

## Upgrading Farm in Production

### Pre-upgrade checklist

1. **Take a database snapshot** before every upgrade. The migration Job is not
   reversible once it has run and the upgrade has succeeded.

   ```bash
   pg_dump -h <postgres-host> -U farm -d farm \
     -F c -f farm-backup-$(date +%Y%m%d-%H%M%S).dump
   ```

2. **Run the upgrade with `--atomic`** so that if the migration Job or any other
   resource fails, Helm automatically rolls back the release to the previous
   revision:

   ```bash
   helm upgrade farm deploy/helm/farm \
     -f my-farm-values.yaml \
     --namespace farm \
     --atomic --timeout 15m
   ```

   `--atomic` implies `--wait`. The 15-minute timeout covers slow migrations
   on large datasets.

3. **If the upgrade is rolled back** (migration failed):
   - Check migration logs before the `hook-delete-policy` removes the Job:
     ```bash
     # While the Job still exists:
     kubectl logs -n farm -l app.kubernetes.io/component=migration --tail=200
     # After it has been deleted (requires a previous terminated container):
     kubectl logs -n farm -l app.kubernetes.io/component=migration --previous
     ```
   - Determine whether the migration ran any DDL statements. If schema changes
     were partially applied (e.g. a column was added mid-transaction), restore
     from the pg_dump taken in step 1 before re-running the upgrade.
   - Fix the migration source and re-run `helm upgrade`.

4. **Zero-downtime contract**: the pre-upgrade migration runs while old pods are
   still serving traffic. All migrations in a single release must be additive
   (see [Migration Compatibility Contract](#migration-compatibility-contract)).

### Migration Compatibility Contract

All TypeORM migrations applied by this chart must be **additive** for the
duration of one release cycle:

- **Allowed**: `ADD COLUMN ... DEFAULT ...`, `CREATE TABLE`, `CREATE INDEX CONCURRENTLY`
- **Not allowed in the same release**: `DROP COLUMN`, `RENAME COLUMN`, `ALTER COLUMN TYPE`,
  `DROP TABLE`

**Reason**: the `pre-upgrade` migration hook runs while old application pods are
still serving traffic. If a migration removes or renames a column that the old
code reads, those pods will start returning errors the moment the migration
completes.

**Two-release pattern for destructive changes**:

- **Release N**: make the column nullable or add the replacement column with a
  default. Deploy. Old pods continue working. New pods use the replacement.
- **Release N+1**: drop the old column. By this point no running pods reference
  it.

This contract is also documented in `CONTRIBUTING.md` under "Database Changes".

