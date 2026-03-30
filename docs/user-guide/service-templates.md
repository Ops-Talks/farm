# Service Templates

Service Templates provide golden path blueprints for scaffolding new services. Instead of starting from scratch, teams select a curated template, fill in a few variables, and receive a fully configured project with best practices built in.

## Core Concepts

### Golden Path

A golden path is an opinionated, pre-configured starting point for a new service. It encodes organizational standards for project structure, CI/CD pipelines, observability, security, and dependency management. Golden paths reduce onboarding time and enforce consistency across teams.

### Template

A template is a repository containing parameterized source files. Variable placeholders are replaced with user-supplied values during scaffolding. Templates can be built-in (shipped with Farm) or custom (created by organization admins).

### Template Variable

A variable is a named parameter that the user fills in when scaffolding. Each variable has a key, label, description, default value, and an optional validation pattern. For example, `SERVICE_NAME` controls the generated project name and must match `^[a-z][a-z0-9-]*$`.

### Scaffold Request

A scaffold request records the intent to create a new service from a template. It tracks the selected template, variable values, target repository, and processing status. Requests can be executed as a full scaffold or as a dry run.

---

## Browsing Available Templates

Navigate to **Service Templates** in the sidebar to view all available templates. Use the filters to narrow results by programming language or framework.

Each template card displays:

- Template name and description
- Language and framework
- Tags for quick categorization
- Number of configurable variables

---

## Scaffolding a New Service

### Step 1: Select a Template

Browse the template catalog and click **Use Template** on the desired template card.

### Step 2: Configure Variables

Fill in the template variables. Required fields are marked with an asterisk. Default values are pre-populated where available.

| Variable | Example Value | Description |
|---|---|---|
| `SERVICE_NAME` | `order-service` | Name used for the project directory and package |
| `PORT` | `3000` | Default port the service listens on |
| `DATABASE_TYPE` | `postgres` | Database driver to configure |

### Step 3: Set Target Repository

Enter the target repository URL where the generated code will be pushed. This must be an empty or non-existent repository.

### Step 4: Preview with Dry Run

Click **Preview** to execute a dry-run scaffold. This shows the file tree that will be generated without creating any resources. Review the output to confirm the structure matches your expectations.

### Step 5: Scaffold

Click **Create Service** to execute the scaffold. Farm renders all template files, substitutes variable values, and pushes the result to the target repository. The scaffold request transitions through `pending`, `in_progress`, and `completed` statuses.

---

## Dry-Run Preview

A dry run renders the template with the supplied variables and returns the list of files that would be generated. No repositories are created or modified. Use dry runs to:

- Validate variable values before committing
- Review the generated file tree for completeness
- Compare output across different variable combinations

---

## Built-in Templates

Farm ships with four built-in templates covering common service archetypes:

### nestjs-api (TypeScript / NestJS)

Production-ready NestJS API with TypeORM, JWT authentication, health checks, and Docker configuration.

**Variables:** `SERVICE_NAME`, `PORT`, `DATABASE_TYPE`

### nextjs-app (TypeScript / Next.js)

Next.js application with App Router, server components, Tailwind CSS, and CI pipeline.

**Variables:** `APP_NAME`, `PORT`

### go-microservice (Go / Gin)

Lightweight Go microservice with Gin HTTP framework, structured logging, and Dockerfile.

**Variables:** `SERVICE_NAME`, `PORT`

### python-worker (Python / FastAPI)

Python background worker with FastAPI health endpoint, queue consumer, and configurable concurrency.

**Variables:** `SERVICE_NAME`, `QUEUE_NAME`, `CONCURRENCY`

---

## Creating Custom Templates (Admin)

Organization administrators can create custom templates to encode team-specific standards.

1. Prepare a template repository with parameterized source files. Use `{{VARIABLE_KEY}}` placeholders in file contents.
2. Navigate to **Service Templates** and click **Create Template**.
3. Fill in the template metadata:

| Field | Description |
|---|---|
| Name | Unique identifier for the template |
| Description | What this template provides |
| Language | Programming language |
| Framework | Framework or runtime |
| Repository URL | Git URL of the template repository |
| Tags | Searchable keywords |

4. Define variables with keys, labels, descriptions, defaults, and optional validation patterns.
5. Click **Save**. The template becomes available to all members of the organization.

---

## Best Practices

- **Keep templates focused.** Each template should produce one deployable unit. Avoid templates that generate multiple services.
- **Use validation patterns.** Add regex patterns to variables (e.g., `^[a-z][a-z0-9-]*$` for service names) to catch invalid input early.
- **Provide sensible defaults.** Pre-populate variables with values that work out of the box so users can scaffold with minimal configuration.
- **Version your template repositories.** Tag releases so scaffold requests reference a stable snapshot rather than a moving target.
- **Test templates with dry runs.** Before publishing a new template, run a dry-run scaffold to verify the generated file tree is correct.
- **Document template purpose.** Write clear descriptions so developers can choose the right template without reading the source.

---

## Related

- [Service Templates API Reference](../api-reference/service-templates.md) for endpoint details and response schemas.
- [Catalog](catalog.md) for managing the components created from templates.
- [Environment Requests](environment-requests.md) for provisioning environments to deploy scaffolded services.
