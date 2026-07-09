# Using the Catalog

The Catalog is the central registry for all software components in your organization. It helps teams discover, understand, and manage the software ecosystem.

## What is a Component?

A component represents any piece of software or infrastructure tracked in Farm. Components are organized into four domain groups to serve Dev, Infra, Data, and Security teams.

## Component Properties

Each component in the catalog has the following properties:

| Property | Description | Required |
|----------|-------------|----------|
| `name` | Unique name for the component | Yes |
| `kind` | Type of component (see below) | Yes |
| `description` | Brief description of the component | No |
| `owner` | Team or individual responsible | Yes |
| `lifecycle` | Current lifecycle stage | No (defaults to `experimental`) |
| `tags` | Labels for categorization | No |
| `metadata` | Custom key-value pairs | No |

### Component Kinds

Components are organized into four domain groups. Use the `kindGroup` query parameter to filter components by domain.

#### Dev (`?kindGroup=dev`)

| Kind | Description |
|------|-------------|
| `service` | A backend service or microservice |
| `library` | A shared library or package |
| `website` | A frontend website or application |
| `api` | An API definition or gateway |
| `component` | A generic software component |
| `system` | A collection of related components |
| `domain` | A business domain boundary |
| `resource` | An external resource dependency |

#### Infrastructure (`?kindGroup=infra`)

| Kind | Description |
|------|-------------|
| `pipeline` | A CI/CD pipeline or build pipeline |
| `queue` | A message queue or event stream |
| `database` | A database instance or cluster |
| `storage` | An object store or file storage |
| `cluster` | A compute cluster (e.g., Kubernetes, ECS) |
| `network` | A network resource (VPC, subnet, load balancer) |

#### Data (`?kindGroup=data`)

| Kind | Description |
|------|-------------|
| `dataset` | A data asset or table |
| `data-pipeline` | An ETL/ELT data pipeline |
| `ml-model` | A machine learning model |

#### Security (`?kindGroup=security`)

| Kind | Description |
|------|-------------|
| `secret` | A secret, credential, or API key |
| `policy` | A security or compliance policy |
| `certificate` | A TLS/SSL certificate |

### Component Lifecycle

| Lifecycle | Description |
|-----------|-------------|
| `planned` | Proposed but not yet started |
| `experimental` | Under development, not production-ready |
| `production` | Stable and in active use |
| `deprecated` | Scheduled for removal |
| `decommissioned` | Fully removed from active use |

## Managing Components

### Registering via YAML (Recommended)

Farm supports registering components using a `catalog-info.yaml` structure, similar to Spotify Backstage. This allows you to keep your component definition alongside your code.

To register a component via YAML content:

```bash
curl -X POST http://localhost:3000/api/v1/catalog/register-yaml \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>" \
  -d '{
    "yaml": "apiVersion: farm.io/v1alpha1\nkind: Component\nmetadata:\n  name: user-service\n  description: Handles user profiles\nspec:\n  type: service\n  owner: platform-team\n  lifecycle: production"
  }'
```

The YAML structure should follow this format:

```yaml
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: user-service
  description: Brief description
  tags: [tag1, tag2]
spec:
  type: service # any valid ComponentKind value
  owner: team-name
  lifecycle: production # one of: planned, experimental, production, deprecated, decommissioned
```

### Discovering Components from a Git Repository

To automatically discover and register all `catalog-info.yaml` files from a git repository, use the `/locations` endpoint:

```bash
curl -X POST http://localhost:3000/api/v1/catalog/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>" \
  -d '{
    "url": "https://github.com/my-org/my-repository.git"
  }'
```

This will trigger an asynchronous process to clone the repository and register all found components.

## Listing Components

To retrieve all components:

```bash
curl http://localhost:3000/api/v1/catalog/components \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"
```

To filter components by domain group:

```bash
# List only infrastructure components
curl http://localhost:3000/api/v1/catalog/components?kindGroup=infra \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"

# List only data team components
curl http://localhost:3000/api/v1/catalog/components?kindGroup=data \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"

# List only security components
curl http://localhost:3000/api/v1/catalog/components?kindGroup=security \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"
```

### Getting a Specific Component

To retrieve a component by ID:

```bash
curl http://localhost:3000/api/v1/catalog/components/{component-id} \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"
```

### Updating a Component

To update an existing component:

```bash
curl -X PATCH http://localhost:3000/api/v1/catalog/components/{component-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>" \
  -d '{
    "description": "Updated description",
    "lifecycle": "production"
  }'
```

### Deleting a Component

To remove a component from the catalog:

```bash
curl -X DELETE http://localhost:3000/api/v1/catalog/components/{component-id} \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"
```

## Best Practices

### Naming Conventions

- Use lowercase letters and hyphens for component names
- Keep names concise but descriptive
- Include the team or domain prefix for clarity (e.g., `platform-auth-service`)

### Ownership

- Always specify a clear owner for each component
- Use team names rather than individual names when possible
- Keep ownership information up to date

### Lifecycle Management

- Start new components as `planned` or `experimental`
- Move to `production` only when the component is stable
- Mark components as `deprecated` before removal to give users notice
- Set components to `decommissioned` after they are fully removed from service

### Tags and Metadata

- Use consistent tag names across components
- Store useful metadata like repository URLs, documentation links, and contact information
- Avoid storing sensitive information in metadata



