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
| [FAQ](faq.md) | Frequently asked questions |
