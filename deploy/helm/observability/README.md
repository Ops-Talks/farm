# Farm Observability Helm Chart

Deploy the Farm observability stack on Kubernetes using Helm. This chart
bundles kube-prometheus-stack, Loki, Tempo, Grafana Alloy, and Pyroscope as
independent sub-chart dependencies with preconfigured scrape configs, dashboards,
and recording rules optimized for Farm workloads.

## OCI Chart Distribution

Farm publishes this chart as an OCI artifact to GitHub Container Registry on
every merge to `main` that bumps the chart `version:` field.

### Quick Start

```bash
helm install farm-observability oci://ghcr.io/ops-talks/helm-charts/farm-observability \
  --version <VERSION> \
  --namespace monitoring \
  --create-namespace \
  -f values.yaml
```

To upgrade an existing release, use `helm upgrade` with the same arguments.

Replace `<VERSION>` with the desired chart version (e.g. `0.2.0`). See the
[releases page](https://github.com/Ops-Talks/farm/releases) for the version
history.

### Chart Signing

Every published chart is signed with
[cosign](https://github.com/sigstore/cosign) using Sigstore keyless signing.
Verify a chart before installing:

```bash
cosign verify \
  ghcr.io/ops-talks/helm-charts/farm-observability:<VERSION> \
  --certificate-identity-regexp="https://github.com/Ops-Talks/farm/.github/workflows/helm-publish.yml@refs/heads/main" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

### Package Visibility

After the first OCI push, the GHCR package must be set to **public** in the
[Package Settings](https://github.com/orgs/Ops-Talks/packages).

---

## Prerequisites

- Kubernetes 1.27+
- Helm 3.10+
- A running Farm application release (the `farm` chart)
- Persistent volumes for Loki, Tempo, and Prometheus (or configure object
  storage backends in `values.yaml`)

## Dependencies

| Chart | Version | Repository |
|-------|---------|------------|
| kube-prometheus-stack | `86.2.2` | prometheus-community |
| loki | `7.0.0` | grafana |
| tempo | `1.24.4` | grafana |
| alloy | `1.9.0` | grafana |
| pyroscope | `2.0.3` | grafana |

## Values

See [`values.yaml`](./values.yaml) for the full list of configurable parameters.
The [`values-dev.yaml`](./values-dev.yaml) file provides minimal overrides for
development and CI environments.
