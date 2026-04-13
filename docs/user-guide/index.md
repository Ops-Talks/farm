# User Guide

Welcome to the Farm User Guide. This section provides comprehensive documentation for end users who want to use Farm to manage their software components and documentation.

## Overview

Farm provides a centralized portal that helps you:

- Organize and discover software components across your organization
- Maintain documentation associated with each component
- Manage user access and authentication

## Getting Started

New to Farm? Start with the [Getting Started](getting-started.md) guide to learn how to set up and begin using Farm.

## Core Features

### Component Catalog

The [Catalog](catalog.md) is the heart of Farm. It provides a centralized registry for all software components in your organization, including:

- Services and microservices
- Shared libraries
- APIs
- Websites and frontend applications
- Infrastructure resources (pipelines, queues, databases, clusters)
- Data assets (datasets, data pipelines, ML models)
- Security artifacts (secrets, policies, certificates)

### Documentation Management

Farm allows you to [manage documentation](documentation.md) associated with each component. This helps teams:

- Keep documentation close to the components they describe
- Discover relevant documentation easily
- Maintain documentation versioning

### Authentication

Learn about [user authentication](authentication.md) in Farm, including:

- User registration with password strength validation
- Login and JWT token management
- Refresh token rotation
- User roles and rate limiting

### Organizations

Farm supports [multi-tenant organizations](organizations.md), providing isolated scopes for catalog components, teams, pipelines, and environments. Each organization has members with role-based access:

- Create and manage organizations
- Add or remove members and assign roles (owner, admin, member)
- Scope resources to a specific organization using the `X-Organization-Id` request header

### Environments and Deployments

Farm tracks deployment environments and component deployments, enabling:

- Environment management (development, staging, production, sandbox)
- Deployment recording with status tracking
- Deployment matrix showing latest versions across environments

### Teams and Ownership

Organize your organization with team management:

- Create teams by type (dev, infra, security, data, platform)
- Assign members to teams
- Link catalog components to team ownership

### CI/CD Integrations

Farm connects to external CI/CD platforms so teams can monitor builds, trigger pipelines, and view deployment status directly from the developer portal. Supported platforms: ArgoCD, CircleCI, Jenkins, and Travis CI. Each platform is connected per-organization using encrypted credentials stored in the database. See the [CI/CD Integrations](../api-reference/cicd.md) reference for endpoint details.

### Helm Integration

Farm discovers Helm releases from Kubernetes Secrets and provides a dedicated UI card on the component detail page for components with a `helmChart` field in their `catalog-info.yaml`. See the [Helm Integration](helm-integration.md) guide for full details.

### Kubernetes Operator

Farm connects to a Kubernetes cluster to discover running workloads, Custom Resource Definitions (CRDs), and Argo Rollout statuses. Components annotated with `farm.io/kubernetes-name` are automatically linked to their cluster workloads. See the [Kubernetes Operator](kubernetes-operator.md) guide for full details.

### System Discovery

Farm provides a [discovery mechanism](system-discovery.md) to see which features and modules are currently active in your organization's portal. This allows users to:

- Identify active plugins and their versions
- Access a centralized list of system capabilities
- Stay informed about platform updates

### Cloud Providers

Farm discovers and registers cloud resources from [AWS, GCP, and Azure](cloud-providers.md). Connected per-organization via encrypted credentials, it imports tagged resources into the Catalog and displays monthly cost estimates.

### Tag Governance

The [tag governance engine](tag-governance.md) lets org admins define required tag keys per resource type. A scheduled audit job evaluates all discovered resources and records violations with remediation hints. Exports to Kyverno `ClusterPolicy` YAML are also supported.

### Kyverno Integration

Farm reads [Kyverno PolicyReports](kyverno-integration.md) from connected clusters and surfaces violations alongside tag governance results on the component detail page.

### Keycloak SSO

Farm integrates with [Keycloak](keycloak-sso.md) for enterprise SSO login, automatic Keycloak group-to-team sync, and Keycloak client credentials as a secret source in pipeline stage configs.

### Istio Service Mesh

Farm surfaces [Istio](istio-integration.md) traffic metrics (RPS, error rate, P50/P95/P99 latency), mTLS and AuthorizationPolicy security posture, service topology, and canary VirtualService weight controls directly on each catalog component.

### Linkerd Service Mesh

Farm surfaces [Linkerd](linkerd-integration.md) traffic metrics (RPS, error rate, P50/P95/P99 latency), ServerAuthorization and AuthorizationPolicy security posture, ServiceProfile route rules, and a service topology graph on each catalog component.

### OPA Policy Engine

Farm integrates with [Open Policy Agent](opa-integration.md) for on-demand policy evaluation. Submit a policy path and input document to receive an allow/deny result with optional violation details. Results linked to catalog components are persisted for historical review.

### Container Registry

Farm connects to [container registries](container-registry.md) (DockerHub, ECR, Harbor) to browse repositories, inspect image manifests, and surface vulnerability scan results on the component detail page.

### FinOps and Cost Management

The [FinOps module](finops.md) integrates with OpenCost to display infrastructure cost data per component and per team. View 7-day and 30-day CPU, memory, PV, and network cost breakdowns, set per-component cost budgets, and identify the top spenders across the platform.

### SLO Management

Farm provides [Service Level Objective tracking](slos.md) for your catalog components. Define availability, latency, and error rate targets with automated error budget calculation. Burn-rate alerts notify you before SLO breaches occur.

### Incident Management

The [incident management](incidents.md) module coordinates your organization's response to production issues. Track incidents from detection through resolution with severity levels, timeline updates, status transitions, and structured post-mortem workflows.

### Custom Dashboards

Build [custom dashboards](dashboards.md) with configurable widget grids to visualize operational data. Combine metrics charts, status indicators, team activity feeds, and alert summaries into a single view tailored to your team's needs.

### Service Templates

Scaffold new services from curated [golden path templates](service-templates.md). Select a template, fill in variables, preview the generated file tree with a dry run, and push a fully configured project to your target repository in minutes.

### Environment Requests

Request deployment environments through a [self-service workflow](environment-requests.md) with administrator approval. Choose between ephemeral and persistent environments, select a resource tier, set a TTL, and monitor provisioning status from submission to expiry.

## Quick Links

| Topic | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Set up and begin using Farm |
| [Catalog](catalog.md) | Manage software components |
| [Documentation](documentation.md) | Create and manage documentation |
| [Authentication](authentication.md) | User management and access |
| [Organizations](organizations.md) | Multi-tenant isolation and member management |
| [CI/CD Integrations](../api-reference/cicd.md) | ArgoCD, CircleCI, Jenkins, Travis CI |
| [Helm Integration](helm-integration.md) | Helm release discovery and chart metadata |
| [Kubernetes Operator](kubernetes-operator.md) | Workload, CRD, and Argo Rollouts discovery |
| [Cloud Providers](cloud-providers.md) | AWS, GCP, Azure resource discovery |
| [Tag Governance](tag-governance.md) | Required tag policies and violation reporting |
| [Kyverno Integration](kyverno-integration.md) | PolicyReport ingestion and ClusterPolicy export |
| [Keycloak SSO](keycloak-sso.md) | Enterprise SSO login and group sync |
| [Istio Service Mesh](istio-integration.md) | Traffic metrics, security posture, canary control |
| [Linkerd Integration](linkerd-integration.md) | Linkerd traffic metrics, security posture, and topology |
| [OPA Integration](opa-integration.md) | Open Policy Agent policy evaluation and result history |
| [Container Registry](container-registry.md) | Repository browsing and vulnerability scanning |
| [FinOps](finops.md) | Infrastructure cost management with OpenCost |
| [SLO Management](slos.md) | Service Level Objectives and error budget tracking |
| [Incident Management](incidents.md) | Incident response, timeline, and post-mortem workflows |
| [Custom Dashboards](dashboards.md) | Configurable widget grids for operational visibility |
| [Service Templates](service-templates.md) | Scaffold new services from curated golden path templates |
| [Environment Requests](environment-requests.md) | Self-service environment provisioning with approval workflows |
| [FAQ](faq.md) | Frequently asked questions |
