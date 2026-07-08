# IaC Integration: Cultivator and Agronomist

Farm integrates with two companion tools that feed Infrastructure-as-Code
visibility data into the portal:

- **Cultivator** -- discovers IaC stacks in a repository and reports Terraform
  or OpenTofu plan/apply run outcomes to Farm.
- **Agronomist** -- scans pinned Terraform module versions across stacks and
  reports drift (how many semver versions behind the latest release each
  module is).

---

## 1. Configuring `IAC_INGEST_TOKEN`

All machine-to-machine ingest endpoints use a static bearer token for
authentication. Set the `IAC_INGEST_TOKEN` environment variable on the Farm
API server:

```bash
# .env / docker-compose.yml / Kubernetes Secret
IAC_INGEST_TOKEN=<a long random string -- treat it like a password>
```

Generate a secure value with:

```bash
openssl rand -hex 32
```

If `IAC_INGEST_TOKEN` is empty, every ingest request will be rejected with
`401 Unauthorized`.

---

## 2. Cultivator -- Reporting Run Results

After each `terraform plan` or `terraform apply` step in CI, post the outcome
to Farm using the `POST /api/v1/iac/runs/ingest` endpoint.

### GitHub Actions example

```yaml
- name: Report IaC run to Farm
  if: always()       # run even on failure so Farm sees failed runs
  env:
    FARM_URL: ${{ vars.FARM_URL }}
    IAC_INGEST_TOKEN: ${{ secrets.IAC_INGEST_TOKEN }}
  run: |
    STATUS="succeeded"
    if [ "${{ job.status }}" != "success" ]; then
      STATUS="failed"
    fi

    curl --fail-with-body -s -X POST \
      "${FARM_URL}/api/v1/iac/runs/ingest" \
      -H "Authorization: Bearer ${IAC_INGEST_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"stackName\": \"${{ inputs.stack_name }}\",
        \"environment\": \"${{ inputs.environment }}\",
        \"provider\": \"terraform\",
        \"type\": \"${{ inputs.run_type }}\",
        \"status\": \"${STATUS}\",
        \"resourceChanges\": {
          \"add\": ${{ steps.tf-plan.outputs.add || 0 }},
          \"change\": ${{ steps.tf-plan.outputs.change || 0 }},
          \"destroy\": ${{ steps.tf-plan.outputs.destroy || 0 }}
        },
        \"triggeredBy\": \"${{ github.actor }}\",
        \"pipelineUrl\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\",
        \"startedAt\": \"${{ steps.start-time.outputs.time }}\",
        \"durationMs\": ${{ steps.duration.outputs.ms || 0 }}
      }"
```

**Request body fields**

| Field | Required | Description |
|---|---|---|
| `stackName` | Yes | Stack identifier -- unique within an environment |
| `environment` | Yes | Target environment (`production`, `staging`, etc.) |
| `provider` | No | `terraform` (default) or `opentofu` |
| `type` | Yes | `plan` or `apply` |
| `status` | Yes | `succeeded`, `failed`, or `cancelled` |
| `resourceChanges` | No | `{ add, change, destroy }` from plan/apply output |
| `triggeredBy` | No | GitHub actor or CI system name |
| `pipelineUrl` | No | Link to the CI run |
| `startedAt` | No | ISO 8601 start time |
| `finishedAt` | No | ISO 8601 finish time |
| `durationMs` | No | Total duration in milliseconds |

---

## 3. Cultivator -- Importing Stacks via Discovery

The `cultivator discover` command scans a repository for IaC stack roots and
writes a JSON manifest. Pass that manifest to Farm with
`POST /api/v1/iac/stacks/import`.

```yaml
- name: Discover stacks with Cultivator
  run: cultivator discover --root ./infra --output stacks.json

- name: Import discovered stacks to Farm
  env:
    FARM_URL: ${{ vars.FARM_URL }}
    IAC_INGEST_TOKEN: ${{ secrets.IAC_INGEST_TOKEN }}
  run: |
    PAYLOAD=$(jq -n --argjson stacks "$(cat stacks.json)" '{"stacks": $stacks}')

    curl --fail-with-body -s -X POST \
      "${FARM_URL}/api/v1/iac/stacks/import" \
      -H "Authorization: Bearer ${IAC_INGEST_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${PAYLOAD}"
```

Each stack entry in the payload:

```json
{
  "name": "core-networking",
  "environment": "production",
  "provider": "terraform",
  "repositoryUrl": "https://github.com/acme/infra",
  "basePath": "stacks/core-networking",
  "externalToolUrl": "https://app.terraform.io/app/acme/workspaces/core-networking"
}
```

**Upsert behaviour:** if a stack with the same `name` + `environment` already
exists, it is updated. The `componentId` field is always preserved.
The `externalToolUrl` field is preserved unless it is explicitly included in
the payload.

---

## 4. Agronomist -- Reporting Module Drift

After running `agronomist report --json report.json`, post the drift data to
Farm using `POST /api/v1/iac/module-drift/ingest`.

### GitHub Actions example

```yaml
- name: Run Agronomist drift scan
  run: agronomist report --json agronomist-report.json

- name: Send module drift to Farm
  if: always()
  env:
    FARM_URL: ${{ vars.FARM_URL }}
    IAC_INGEST_TOKEN: ${{ secrets.IAC_INGEST_TOKEN }}
  run: |
    MODULES=$(jq '.modules' agronomist-report.json)
    PAYLOAD=$(jq -n --argjson modules "${MODULES}" '{"modules": $modules}')

    curl --fail-with-body -s -X POST \
      "${FARM_URL}/api/v1/iac/module-drift/ingest" \
      -H "Authorization: Bearer ${IAC_INGEST_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${PAYLOAD}"
```

**Expected module shape from Agronomist:**

```json
{
  "modules": [
    {
      "stackPath": "stacks/networking/main.tf",
      "moduleName": "terraform-aws-modules/vpc/aws",
      "sourceUrl": "https://registry.terraform.io/terraform-aws-modules/vpc/aws",
      "currentRef": "v3.14.0",
      "latestRef": "v3.19.0"
    }
  ]
}
```

Farm automatically computes `versionsBehind` from the semver distance between
`currentRef` and `latestRef`. For non-semver refs (e.g., `main`, commit SHAs),
`versionsBehind` defaults to `1`.

---

## 5. Viewing IaC Data in Farm

Navigate to **IaC** in the sidebar (Infrastructure section). The dashboard
shows:

- Per-environment tabs with stack cards
- Each stack card: provider badge, last run status icon, run type, resource
  change chips, relative time, and an external tool link if configured
- Failed stacks surfaced at the top within each environment tab
- A **Module Drift** view tab listing all detected outdated module references

Click a stack card to view its full run timeline with pagination.



