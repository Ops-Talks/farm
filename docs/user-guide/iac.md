# Infrastructure as Code

Farm's IaC section gives platform engineers and DevOps teams a single place to track the state of every Terraform, OpenTofu, and Pulumi stack in the organization. Rather than switching between Terraform Cloud workspaces, Atlantis logs, and pull-request comments to understand what changed and when, you can see run outcomes, resource change counts, module version drift, and the full dependency graph of your infrastructure from the Farm portal.

The IaC section is populated by two companion tools — **Cultivator**, which reports plan and apply outcomes from CI, and **Agronomist**, which scans module version pins and reports drift. Data arrives via authenticated ingest endpoints; no polling or cloud-provider credentials are required on the Farm server side. See [IaC Integration: Cultivator and Agronomist](iac-integration.md) for setup instructions.

## Navigation

The sidebar groups IaC into two entries under the **Infrastructure** section:

- **IaC** — opens the IaC Dashboard, the primary overview of all stacks.
- **IaC Modules** — opens the Module Catalog, where registered Terraform, OpenTofu, and Pulumi modules are browsable.

The **Stacks** sub-page (`/iac/stacks`) is reachable from the IaC sidebar entry and provides a flat, filterable table of every stack registered in Farm.

---

## IaC Dashboard

The dashboard at `/iac` is the main at-a-glance view of your infrastructure estate. Stacks are grouped into environment tabs — for example, **production**, **staging**, and **development** — so you can focus on one environment at a time without losing context about the others.

### Reading a stack card

Each stack is represented by a card that conveys its current state without requiring you to click through:

| Element | What it shows |
|---|---|
| Provider badge | The IaC engine (`Terraform`, `OpenTofu`, or `Pulumi`) alongside the cloud provider icon |
| Environment badge | The environment this stack targets (e.g., `production`) |
| Status icon | A green checkmark for a succeeded last run, a red X for a failed run, or an amber spinning indicator for a run currently in progress |
| Run type | Whether the last run was a `plan` or an `apply` |
| Resource change chips | Green `+N` for resources to be added, amber `~N` for resources to be changed, red `-N` for resources to be destroyed |
| Relative time | How long ago the last run completed, shown as a human-readable string such as "3m ago" or "2d ago" |
| External tool button | A link icon that opens the stack in its external tool (Terraform Cloud, Atlantis, or similar). This button is only shown when an `externalToolUrl` has been configured for the stack. |

Within each environment tab, **failed stacks are surfaced at the top** so that stacks requiring attention are immediately visible without scrolling.

### Module Drift tab

The **Module Drift** tab on the dashboard lists every outdated module reference detected across all stacks by Agronomist. Each row shows:

- The stack path where the outdated reference was found
- The module name and source
- The currently pinned version (`currentRef`) and the latest available version (`latestRef`)
- The number of versions behind
- A link to the module's entry in the Module Catalog, if a matching catalog entry exists

This view is populated after Agronomist has run and pushed a drift report. If no drift data has been ingested yet, the tab is empty. Rows with non-semver references (for example, `main` or a commit SHA) are reported as one version behind by convention.

---

## Stack List

The **Stacks** page at `/iac/stacks` presents all registered stacks in a table and is useful when you want to search across environments or export a mental inventory of what is registered. Use the **Environment** filter dropdown at the top of the page to narrow the table to a specific environment. Each row links to the full stack detail page.

---

## Stack Detail

Clicking a stack card on the dashboard or a row in the Stacks table opens the stack detail page at `/iac/stacks/:id`. The top of the page shows a metadata summary:

| Field | Description |
|---|---|
| Provider | The IaC engine (`terraform`, `opentofu`, or `pulumi`) |
| Engine | Rendered alongside the cloud provider icon |
| Repository URL | A clickable link to the source repository |
| Linked component | The catalog component this stack is associated with, if one has been set |
| Environment | The target environment |
| External tool URL | A direct link to the workspace in an external IaC orchestration tool, if configured |

Below the metadata, two tabs provide deeper context.

### Run History tab

The Run History tab shows a paginated, chronological list of all runs that have been reported for this stack. Each row contains:

- A **type badge** indicating whether the run was a `plan` or an `apply`
- A **status chip** showing `succeeded`, `failed`, or `cancelled`
- Resource change counts (add / change / destroy)
- The identity of who or what triggered the run
- Duration
- Relative time since the run completed
- A link to the originating CI pipeline run, when a `pipelineUrl` was included in the ingest payload

The list is ordered from newest to oldest. Use the pagination controls at the bottom to step through older runs.

### Resource Map tab

The Resource Map tab renders an interactive directed graph of all Terraform or OpenTofu resources in the stack. Each node is labeled with the resource address in the form `type.name` — for example, `aws_vpc.main` or `aws_subnet.private`. Directed edges between nodes represent explicit `depends_on` relationships or implicit references detected in the configuration.

The graph uses a force-directed layout. You can drag nodes to rearrange them and zoom in or out with the scroll wheel. Hovering a node highlights its direct dependencies and dependents.

The Resource Map is only populated when Cultivator has pushed a resource topology via the ingest endpoint alongside a run result. If no topology has been ingested, the tab displays a notice indicating that no resource data is available for this stack.

---

## IaC Module Catalog

The Module Catalog at `/iac-modules` is a searchable registry of all Terraform, OpenTofu, and Pulumi modules that have been registered in Farm. It is the authoritative source for module versions, input variables, and outputs within your organization.

### Browsing and searching

The catalog page shows all modules in a table with the following columns: name, provider badge, engine, latest version, and description. Two controls help you narrow the list:

- The **search field** filters by module name or description as you type.
- The **Provider** filter dropdown limits results to a specific cloud provider: AWS, GCP, Azure, Kubernetes, or Other.

### Module detail page

Clicking any row opens the module detail page at `/iac-modules/:id`. The top of the page shows the module name, provider, engine, a link to the source repository, and the latest registered version.

**Version selector.** A dropdown below the header lets you select any registered version of the module. Selecting a version immediately updates the Variables table, Outputs table, and usage snippet shown on the page. This makes it straightforward to compare the interface of different versions before deciding which one to adopt.

**Variables table.** Lists every input variable declared in `variables.tf` for the selected version. Columns are:

| Column | Description |
|---|---|
| Name | The variable name as declared in HCL |
| Type | The HCL type constraint; rows with no declared type show `any` |
| Description | The variable's description string, if present |
| Default | The default value, if one is set |

**Outputs table.** Lists every output declared in `outputs.tf` for the selected version, with name, type, and description columns.

**Usage snippet.** Below the tables, a copyable HCL snippet shows how to reference the module at the selected version. Click the copy icon to place the snippet on your clipboard, then paste it directly into your stack configuration.

**Sync button.** The **Sync** button at the top of the module detail page triggers a metadata fetch from the source repository. Sync discovers any new semver tags that have been published since the last ingest and re-parses `variables.tf` and `outputs.tf` for each version. Use this when you have published a new module release and want it to appear in Farm immediately without waiting for a scheduled scan.

---

## IaC tab on component detail pages

Every component detail page in the catalog (`/catalog/:id`) includes an **IaC** tab. This tab lists two things:

- All stacks that have been linked to this component, with their current status and last-run summary.
- All IaC modules that have been associated with this component.

Linking stacks and modules to catalog components is the primary way to give your service catalog IaC context. When a team navigates to a service or database component, the IaC tab immediately answers questions like "which stack manages this?" and "which module version is in use?". Associations are set either through Cultivator's stack import payload (via the `componentId` field) or by editing the stack record directly in the Farm UI.

---

## Setting up CI integration

The dashboard and detail pages described above are only as current as the data that has been pushed into Farm. To populate them, you need to configure Cultivator (for run reporting and stack discovery) and optionally Agronomist (for module drift). Both tools authenticate to Farm using a shared `IAC_INGEST_TOKEN` and post to dedicated ingest endpoints.

Full setup instructions, including GitHub Actions workflow examples and request payload references, are in the [IaC Integration: Cultivator and Agronomist](iac-integration.md) guide.

!!! tip "Related features"
    For tracking the deployment health of the services that these stacks provision, see [Observability](observability.md). For coordinating the human response when a failed run causes an incident, see [Incident Management](incidents.md).
