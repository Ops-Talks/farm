# Farm Helm Chart & SRE Audit

**Audit date**: 2025
**Scope**: `deploy/helm/farm/`, `observability/`, `.github/workflows/`, `apps/{api,web}/Dockerfile`
**Chart version**: `0.1.0` / `appVersion: 0.25.7`
**Method**: Static review + `helm lint` + `helm template` (rendered with prod-like flags)

---

## Executive Summary — Top 5 Critical Issues

| # | Issue | Why it matters |
|---|---|---|
| 1 | **Migration runs as `post-install` hook on fresh install** (`templates/migration-job.yaml:14,38,62,77`) — Helm does NOT wait for hooks before the main release resources are created. The API Deployment boots in parallel with the migration Job and may serve traffic against an empty schema until the Job completes. | Cold-start 5xx burst on every fresh install; violates the documented "no manual schema changes" rule because the API observably sees an inconsistent DB state. |
| 2 | **No `helm lint` / `helm template` / `kubeconform` job in CI** (`.github/workflows/`). Only `release.yml` touches the chart (appVersion bump). | Template regressions (broken hook ordering, indentation, missing labels) reach `main` without gate. The F-1 migration bug history shows this class of regression is real. |
| 3 | **Chart version is frozen at `0.1.0` while `appVersion` is `0.25.7`** (`Chart.yaml:5-6`). Helm SemVer best practice requires a chart-version bump on every template change. | Breaks downstream OCI/Helm registry consumers, Renovate/Dependabot diffing, and `helm diff` history. |
| 4 | **Drift between `observability/prometheus-rules.yml` and `templates/prometheusrule.yaml`** — same four alerts maintained in two places by hand. Sloth SLOs (`observability/sloth-slos.yml`) are **not compiled into a PrometheusRule** (S559 still TODO). | Per project convention "Never write raw multi-burn-rate alert rules by hand — use Sloth." Current alerts are point-thresholds, not error-budget multi-window/multi-burn-rate; will alert-fatigue. |
| 5 | **NetworkPolicy egress allows DB/Redis ports without `to:` selector** (`templates/api/networkpolicy.yaml:45-52`). With `policyTypes: [Egress]` and no `to`, the rule permits TCP to those ports against **any** IP in the cluster (and externally if the CNI allows). | Lateral movement: a compromised API pod can reach any PostgreSQL/Redis it can route to, defeating the purpose of enabling NetworkPolicy. |

---

## Detailed Findings

| # | Sev | Category | File:Line | Issue | Recommendation | Effort |
|---|-----|---------|-----------|-------|----------------|--------|
| F-1 | **Critical** | Migration ordering | `templates/migration-job.yaml:14,38,62,77`; `templates/NOTES.txt:27-34` | Hook is `post-install,pre-upgrade`. On fresh install, post-install hooks run after release resources are created — API Deployment may receive traffic before schema exists. | Add an `initContainer` on the API Deployment that waits for the Job's completion (`kubectl wait --for=condition=complete job/farm-migration` via a small image), OR change to a true `pre-install` hook + ship the postgresql subchart resources as a `pre-install` hook themselves, OR rely on the API's own startup-time `migration:run` (preferred for idempotency). At minimum, document in NOTES.txt that operators MUST use `helm install --wait`. | M |
| F-2 | **Critical** | CI gate | `.github/workflows/*` | No `helm lint`, `helm template --validate`, `kubeconform`, or `chart-testing (ct)` job. Hadolint covers Dockerfiles; Trivy covers images; chart is untested. | Add `.github/workflows/helm.yml` running: (a) `helm lint deploy/helm/farm` (b) `helm template ... \| kubeconform -strict -summary -schema-location default -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json'` for ServiceMonitor/ExternalSecret CRDs (c) `helm template` matrix against `values-dev.yaml`, an in-tree `values-prod.yaml.example`, and `--set postgresql.enabled=true`. Run on every PR touching `deploy/helm/**`. | M |
| F-3 | **High** | Chart metadata | `Chart.yaml:5` | `version: 0.1.0` is stale vs. `appVersion: 0.25.7`. No `kubeVersion`, no `icon`, no `annotations` (artifacthub.io/changes). `helm lint` already prints `[INFO] Chart.yaml: icon is recommended`. | Bump chart version per template change (semver: patch for additive/template-only, minor for new values, major for breaking). Add `kubeVersion: ">=1.27.0-0"`. Add `icon: https://raw.githubusercontent.com/Ops-Talks/farm/main/docs/assets/logo.png`. Add ArtifactHub annotations block (`artifacthub.io/changes`, `/maintainers`, `/license`). | S |
| F-4 | **High** | Observability | `observability/prometheus-rules.yml` ⇄ `deploy/helm/farm/templates/prometheusrule.yaml` | Two hand-maintained copies of the same four alerts. Sloth SLOs (`observability/sloth-slos.yml`) are not compiled into a chart-shipped PrometheusRule. | Make `templates/prometheusrule.yaml` the source of truth (it can be `template`'d for dev with `helm template ... \| yq` to produce the standalone YAML). Add a CI job that runs `sloth generate -i observability/sloth-slos.yml -o deploy/helm/farm/templates/_sloth-rules.gen.yaml` and asserts no diff (or write a Helm template that conditionally includes the generated file). Add `prometheusRule.sloth.enabled` value. Remove the duplicated standalone `prometheus-rules.yml` or auto-generate it from the template. | M |
| F-5 | **Critical** | NetworkPolicy egress | `templates/api/networkpolicy.yaml:45-52` | DB and Redis egress rules are port-only, with no `to:` selector — effectively `0.0.0.0/0:<port>`. | Render `to: [{ podSelector: { matchLabels: { app.kubernetes.io/name: postgresql } } }]` when `postgresql.enabled`, and a configurable `externalDatabase.egressCIDR` (e.g. `10.0.0.0/16`) when external. Same pattern for Redis. Use `ipBlock` for managed DB endpoints. | M |
| F-6 | High | NetworkPolicy ingress | `templates/api/networkpolicy.yaml:21-26` | When both `ingressControllerNamespaceSelector` and `ingressControllerPodSelector` are empty (defaults), and the user only sets one, the rendered policy could allow `all namespaces` or `all pods in selected ns`. The conditional gates the entire block on the namespace selector alone. | Require BOTH selectors when NetworkPolicy is enabled with Ingress (add `fail` in `validate.yaml`). Or render an `ipBlock` for known LoadBalancer source CIDRs as an alternative. Document in README that an empty `{}` selector means "all of that scope". | S |
| F-7 | High | Migration race | `values-dev.yaml:39-46`; `templates/migration-job.yaml:100-119` | Dev profile disables `waitForDb` and relies on `backoffLimit: 6` — works for KinD but the wait-for-db init in prod uses busybox `nc` with **no upper retry bound**, only `activeDeadlineSeconds: 300`. | Bound the loop: `for i in $(seq 1 60); do nc -z ... && exit 0; sleep 5; done; exit 1` so failure is logged before deadline hard-kill. Pin `busybox:1.36@sha256:...` (today the chart leaves it as a mutable tag — see comment in `values.yaml:566-568`). | S |
| F-8 | High | Secret rotation | `templates/api/deployment.yaml:24-26` | `checksum/secret` annotation `include`s `templates/api/secret.yaml`, which renders **empty** when `api.existingSecret` is set or when ESO/SealedSecrets manages the Secret. Rotating the external Secret does not roll the pod. | When `existingSecret` is set, switch to a Reloader-style approach: (a) document the `reloader.stakater.com/auto: "true"` annotation pattern, OR (b) include the `existingSecret` resourceVersion via a lookup (`{{ (lookup "v1" "Secret" .Release.Namespace .Values.api.existingSecret).metadata.resourceVersion }}`) so checksum changes trigger rollout. | M |
| F-9 | High | ExternalSecret API | `templates/external-secret.yaml:17` | `apiVersion: external-secrets.io/v1beta1` is deprecated since ESO 0.10 (GA `v1` available). | Bump to `external-secrets.io/v1`, gate the version via a `Capabilities.APIVersions.Has` check for backward compatibility. | S |
| F-10 | High | ExternalSecret coverage | `templates/external-secret.yaml:32-44` | Only `JWT_SECRET`, `DATABASE_PASSWORD`, `REDIS_PASSWORD` are mapped. `SMTP_PASS`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `KEYCLOAK_CLIENT_SECRET`, `LDAP_BIND_PASSWORD`, `IAC_INGEST_TOKEN`, `SWAGGER_PASSWORD` cannot be sourced from a remote backend. | Replace hardcoded list with `range .Values.api.externalSecret.dataFrom` (supporting both `extract` and `find` ESO modes) or iterate `api.secrets` map. | S |
| F-11 | High | values.schema.json | `deploy/helm/farm/` | No JSON Schema. Misspelled keys (`autoScaling`, `ingres`) silently succeed — common cause of "the chart applied but nothing happened" incidents. | Generate `values.schema.json` (e.g. with `helm schema-gen`) and commit it. Helm validates against it automatically on `install/upgrade`. | M |
| F-12 | Medium | Resource limits drift from convention | `values.yaml:91-97` | API `limits.cpu: 500m, memory: 512Mi`. The project's own convention table (Farm-SRE agent) says `limits.cpu: 1000m, memory: 1Gi` for the API. | Either bump the defaults to match the documented convention, or update the convention. Reconcile to a single source. | S |
| F-13 | Medium | Sub-chart pinning | `Chart.yaml:14-22` | postgresql `15.5.38`, redis `19.6.4` — pinned (good). No Dependabot ecosystem for `helm` in `.github/dependabot.yml`. | Add `package-ecosystem: docker` is present but no `helm` ecosystem (supported since Dependabot 2). Add a `helm` ecosystem entry pointing at `/deploy/helm/farm`. | S |
| F-14 | Medium | Service appProtocol | `templates/api/service.yaml:10-14`; `templates/web/service.yaml` | No `appProtocol: http` on the port. L7-aware ingress/service-mesh (Istio, Linkerd, Gateway API) cannot infer protocol. | Add `appProtocol: http`. | S |
| F-15 | Medium | API metrics scrape | `values.yaml:678`; `templates/servicemonitor.yaml:20` | ServiceMonitor scrapes `port: http, path: /api/metrics` — fine for shared port, but every scrape spans through the app's middlewares (auth, throttling) and pollutes the `http_request_duration_seconds` histogram with metrics-endpoint requests. | Either (a) expose a dedicated `metrics` container port (3001) and add it to the Service, OR (b) add `metricRelabelings` defaults that drop `http_request_duration_seconds{path="/api/metrics"}`. | S |
| F-16 | Medium | preUpgradeCheck reuses migration SA | `templates/pre-upgrade-check.yaml:32` | References `farm-migration` SA, but that SA is created at hook weight `-5` (post-install,pre-upgrade) — on a pre-upgrade it IS created by the time weight `-20` runs because `pre-upgrade` hooks share an ordering window, BUT the SA's hook-delete-policy is `before-hook-creation` (not `hook-succeeded`), so on upgrade #2 the SA is deleted before recreation: weight ordering needs the SA to exist when `-20` runs. Verify the ordering — Helm processes hook-weights ascendingly, so `-20` runs **before** `-5`, meaning the SA does NOT exist yet on pre-upgrade. | Either: (a) drop `serviceAccountName` from `pre-upgrade-check.yaml` (default SA is fine for `nc`, no API calls needed), or (b) create a dedicated `pre-upgrade-check` SA at weight `-25`. **Test this with `helm upgrade --dry-run --debug`**. | S |
| F-17 | Medium | Migration empty SECRET when externalDatabase.existingSecret set | `templates/migration-job.yaml:43-51` | Renders `DATABASE_PASSWORD: ""` into `farm-migration-secret` when neither postgresql nor `externalDatabase.password` is set, even though the actual password lives in `externalDatabase.existingSecret` and is correctly consumed at line 139. The empty Secret is noise. | Gate Secret rendering on `or .Values.postgresql.enabled .Values.externalDatabase.password` (skip entirely when `externalDatabase.existingSecret` handles it). | S |
| F-18 | Medium | PrometheusRule alerts lack actionable details | `templates/prometheusrule.yaml:17-68` | `FarmApiDown` fires on `up == 0 for 1m` — too tight, no multi-burn-rate. `FarmApiNodeHeapHigh` uses `nodejs_heap_size_total_bytes` (Node's V8 reported total) instead of container memory working set. No `severity: page/ticket` separation. | Replace with Sloth-generated multi-window/multi-burn-rate alerts. Switch heap alert to `container_memory_working_set_bytes / container_spec_memory_limit_bytes`. Per project convention: "use Sloth". | M |
| F-19 | Medium | No PodAntiAffinity default | `values.yaml:277, 478` | `affinity: {}`. Multi-replica deployments will happily co-locate on the same node. | Ship a default `podAntiAffinity: preferredDuringSchedulingIgnoredDuringExecution` keyed on hostname + selector labels. Operators can override. Add a hint in README and the values.yaml `topologySpreadConstraints` comment block. | S |
| F-20 | Medium | Postgres/Redis PDB / persistence backup | `values.yaml:634-662` | Subcharts deployed with `persistence.enabled: true, size: 8Gi/2Gi`. No backup strategy. No PDB on the subchart's StatefulSet. No mention in NOTES.txt that subcharts are dev-only and require external backups in prod. | Add explicit `postgresql.enabled: false` advisory in NOTES.txt for production, with a "production checklist" link. Add `volumePermissions` / backup operator (Velero / pgBackRest) example values. | M |
| F-21 | Medium | Probes inconsistency vs convention | `values.yaml:99-133` (api) | Convention: liveness uses `/api/health/live`, readiness uses `/api/health`. ✅ Correct. **But web** uses `/api/health` for liveness too (`values.yaml:389-396`) — DB is irrelevant for web; consider `/api/health/live` symmetry. | Document in README why API and Web use different probe schemes, or add `/api/health/live` to the web app for symmetry. | S |
| F-22 | Low | Validate `runAsGroup` | `values.yaml:77-84` | `containerSecurityContext` sets `runAsUser: 1001` but NOT `runAsGroup: 1001`. Kernel uses the image's default GID (often 0). | Add `runAsGroup: 1001` and `seccompProfile.type: RuntimeDefault` to `containerSecurityContext`. | S |
| F-23 | Low | Missing seccompProfile | `values.yaml:77-84`, `360-372` | No `seccompProfile`. PodSecurity `restricted` policy (1.25+) requires it. | Add `seccompProfile: { type: RuntimeDefault }` at pod level. | S |
| F-24 | Low | Helpers: brittle `imagePullSecrets` indent | `_helpers.tpl:229-247` | Template emits a top-level YAML key (`imagePullSecrets:`) that callers must `nindent 6`. Easy to mis-indent and silently break. | Refactor to return only the list of `- name:` entries and let the caller do `imagePullSecrets:` + `nindent`. | S |
| F-25 | Low | Web Service exposes no `appProtocol`; Web has no NetworkPolicy ingressController gate by default | `templates/web/networkpolicy.yaml:17` | If `web.networkPolicy.enabled=true` without setting `ingressControllerNamespaceSelector`, the entire `from:` block disappears and the web pod is unreachable from anywhere (including the API). | Add a default `from: [{ podSelector: matchLabels: { app.kubernetes.io/component: api } }]` OR add a `validate.yaml` `fail` requiring the selector when web NetworkPolicy is enabled. | S |
| F-26 | Low | NOTES.txt typos / clarity | `templates/NOTES.txt:11` | "/api/docs" linked from web hostname will 404 if `api.hostname == web.hostname` and ingress routing isn't path-based. The split-ingress assumes two distinct hostnames. | Clarify NOTES.txt: "When `ingress.api.hostname == ingress.web.hostname`, use path-based routing (`ingress.api.path: /api`)." | S |
| F-27 | Low | observability config files lack chart shipment | `observability/{loki,tempo,promtail,alloy}.*` | These files are for the **compose** observability stack, not Kubernetes. Chart users get dashboards (`grafanaDashboards`) but not Loki/Tempo wiring. | Either (a) ship a `farm-observability` umbrella chart with optional deps on loki/tempo/grafana-alloy, or (b) document clearly in README that these files are docker-compose-only. | M |
| F-28 | Low | release.yml chart appVersion bump but not chart version | `.github/workflows/release.yml` | The release workflow rewrites `appVersion` but not `version`. | Bump chart `version` per Semantic Versioning when the chart itself changes. Use `helm-docs` to also regenerate `README.md` parameter table. | S |
| F-29 | Low | No `helm-docs` automation | `deploy/helm/farm/README.md` | The README has hand-maintained parameter tables that drift from `# --` comments. | Add `helm-docs` to a `make helm-docs` target and a CI check. The `# --` comments in `values.yaml` are already well-structured for it. | S |
| F-30 | Low | Dockerfile base image alignment | `apps/api/Dockerfile:7`; `apps/web/Dockerfile:6` | Both use `node:26-alpine@sha256:7c6af15...`. ✅ Good. No issue — verified compliant with FARM-S538. | — | — |

---

## Action Plan by Severity

### Critical (do this sprint)

1. **F-1 Migration ordering** — implement option A: API Deployment gets an `initContainer` `wait-for-migration` using `bitnami/kubectl` (or a tiny `curl` against the API health endpoint after migration). Acceptance: `helm install farm . --wait` on a fresh KinD cluster shows zero 5xx in API logs during the first 60s.
2. **F-2 CI helm gate** — create `.github/workflows/helm.yml` with three jobs: `lint`, `template-matrix`, `kubeconform`. Acceptance: PR that breaks any template (e.g. removes `nindent`) fails CI before merge.
3. **F-4 Sloth integration** — add `make sloth-generate` and a CI no-diff check; replace `templates/prometheusrule.yaml` content with the Sloth-generated rules conditionally toggled by `prometheusRule.sloth.enabled`. Acceptance: `observability/sloth-slos.yml` → rendered rules are deployed via `prometheusRule.enabled=true` and the standalone `observability/prometheus-rules.yml` is removed or auto-generated.
4. **F-5 NetworkPolicy egress tightening** — render `to:` selectors. Acceptance: rendered policy for `postgresql.enabled=true` includes `to.podSelector` matching the subchart pods; for external DB, requires `externalDatabase.egressCIDR` and renders `ipBlock`.

### High (next sprint)

5. **F-3** chart version bump policy + add `kubeVersion`, `icon`, `annotations`. Acceptance: `helm lint` shows 0 INFO messages, ArtifactHub renders changelog.
6. **F-6** `validate.yaml` enforces both ingressController selectors when NetworkPolicy + Ingress are both on. Acceptance: `helm template` fails fast with actionable error.
7. **F-7** bound `wait-for-db` loop; pin busybox digest. Acceptance: container logs show explicit "gave up after N retries".
8. **F-8** ESO/SealedSecrets rotation triggers rollout. Acceptance: changing the external Secret triggers a Deployment rollout within one reconcile loop.
9. **F-9** ExternalSecret API bump to `v1`. Acceptance: works against ESO ≥ 0.10.
10. **F-10** ExternalSecret iterates `api.secrets` map. Acceptance: `SMTP_PASS` can be sourced from Vault without code change.
11. **F-11** ship `values.schema.json`. Acceptance: typo `autoScaling` fails `helm install`.

### Medium (backlog)

12. F-12 reconcile resource limits with documented convention.
13. F-13 add `helm` ecosystem to Dependabot.
14. F-14 add `appProtocol: http` to all Services.
15. F-15 metricRelabelings or dedicated metrics port.
16. F-16 fix preUpgradeCheck ServiceAccount ordering — **verify with `helm upgrade --dry-run --debug`** on a real cluster; this is a latent bug.
17. F-17 skip empty migration-secret when ESO handles it.
18. F-18 Sloth-driven alerts replace point-threshold alerts.
19. F-19 default podAntiAffinity (preferred).
20. F-20 prod-readiness checklist for subcharts (backups, PDB, anti-affinity).
21. F-21 web `/api/health/live` parity.

### Low (housekeeping)

22. F-22 add `runAsGroup`, F-23 `seccompProfile`.
24. F-24 refactor imagePullSecrets helper.
25. F-25 default web NetworkPolicy ingress from API pod.
26. F-26 NOTES.txt path-routing clarification.
27. F-27 observability/ vs chart split documentation.
28. F-28 chart version bump in release.yml.
29. F-29 `helm-docs` integration.

---

## References

- Helm chart best practices — https://helm.sh/docs/chart_best_practices/
- Helm values schema — https://helm.sh/docs/topics/charts/#schema-files
- Kubernetes production best practices — https://kubernetes.io/docs/setup/best-practices/
- Pod Security Standards (restricted) — https://kubernetes.io/docs/concepts/security/pod-security-standards/
- NetworkPolicy semantics — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Sloth multi-burn-rate SLO generator — https://sloth.dev/usage/cli/
- External Secrets Operator v1 — https://external-secrets.io/latest/api/externalsecret/
- Prometheus Operator CRDs — https://prometheus-operator.dev/docs/api-reference/api/
- ArtifactHub annotations — https://artifacthub.io/docs/topics/annotations/helm/
- Google SRE Workbook (SLO/error-budget) — https://sre.google/workbook/

---

**Audit complete. No code modified.** To persist this audit, run:
```bash
mkdir -p .github/agents/audits
# Paste the markdown above into .github/agents/audits/sre-audit.md
```

Top recommended next step after your review: greenlight **F-1 (migration ordering)** and **F-2 (CI helm gate)** together — F-2 will catch any regression introduced while fixing F-1.
