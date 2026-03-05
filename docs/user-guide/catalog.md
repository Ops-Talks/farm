# Using the Catalog

The Catalog is the central registry for all software components in your organization. It helps teams discover, understand, and manage the software ecosystem.

## What is a Component?

A component represents any piece of software tracked in Farm. This includes:

- Backend services and microservices
- Shared libraries and packages
- APIs and API gateways
- Websites and frontend applications
- Generic software components

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

| Kind | Description |
|------|-------------|
| `service` | A backend service or microservice |
| `library` | A shared library or package |
| `website` | A frontend website or application |
| `api` | An API definition or gateway |
| `component` | A generic software component |

### Component Lifecycle

| Lifecycle | Description |
|-----------|-------------|
| `experimental` | Under development, not production-ready |
| `production` | Stable and in active use |
| `deprecated` | Scheduled for removal |

## Managing Components

### Registering via YAML (Recommended)

Farm supports registering components using a `catalog-info.yaml` structure, similar to Spotify Backstage. This allows you to keep your component definition alongside your code.

To register a component via YAML content:

```bash
curl -X POST http://localhost:3000/api/catalog/register-yaml \
  -H "Content-Type: application/json" \
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
  type: service # one of: service, library, website, api, component
  owner: team-name
  lifecycle: production # one of: experimental, production, deprecated
```

### Discovering Components from a Git Repository

To automatically discover and register all `catalog-info.yaml` files from a git repository, use the `/locations` endpoint:

```bash
curl -X POST http://localhost:3000/api/catalog/locations \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/my-org/my-repository.git"
  }'
```

This will trigger an asynchronous process to clone the repository and register all found components.

### Creating a Component (REST)

You can also create a component using a standard JSON payload:

### Listing Components

To retrieve all components:

```bash
curl http://localhost:3000/api/catalog/components
```

### Getting a Specific Component

To retrieve a component by ID:

```bash
curl http://localhost:3000/api/catalog/components/{component-id}
```

### Updating a Component

To update an existing component:

```bash
curl -X PATCH http://localhost:3000/api/catalog/components/{component-id} \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "lifecycle": "production"
  }'
```

### Deleting a Component

To remove a component from the catalog:

```bash
curl -X DELETE http://localhost:3000/api/catalog/components/{component-id}
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

- Start new components as `experimental`
- Move to `production` only when the component is stable
- Mark components as `deprecated` before removal to give users notice

### Tags and Metadata

- Use consistent tag names across components
- Store useful metadata like repository URLs, documentation links, and contact information
- Avoid storing sensitive information in metadata
