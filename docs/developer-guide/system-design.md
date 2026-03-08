# System Design

This document provides a comprehensive overview of the Farm system design, including architecture decisions, component interactions, and data models.

## Introduction

Farm is a developer portal platform designed to help organizations manage their software catalog, technical documentation, and user access. This document describes the system architecture and design decisions that shape the platform.

## Goals and Non-Goals

### Goals

- Provide a simple, easy-to-deploy developer portal
- Enable teams to catalog and discover software components
- Associate documentation with software components
- Support user authentication and access management
- Maintain a clean, modular codebase

### Non-Goals

- Replace complex, full-featured developer platforms
- Provide a plugin ecosystem
- Support real-time collaboration features

## System Architecture

### High-Level Overview

```
+------------------------------------------------------------------+
|                          Clients                                  |
|  (Web Applications, CLI Tools, Scripts, CI/CD Pipelines)         |
+----------------------------------+-------------------------------+
                                   |
                                   | HTTP/REST
                                   v
+------------------------------------------------------------------+
|                       Farm API Server                             |
|  +------------------------------------------------------------+  |
|  |                    NestJS Application                       |  |
|  |  +--------+ +--------+ +-------+ +------+ +---------+     |  |
|  |  |  Auth  | |Catalog | | Docs  | | Envs | | Plugin  |     |  |
|  |  | Module | | Module | |Module | |Module| | Manager |     |  |
|  |  +---+----+ +---+----+ +---+---+ +--+---+ +----+----+     |  |
|  |      |          |          |         |          |           |  |
|  |  +---v----------v----------v---------v----------v------+   |  |
|  |  |               PostgreSQL Database                   |   |  |
|  |  |    (users, components, documentation, environments, |   |  |
|  |  |     deployments, migrations)                        |   |  |
|  |  +-----------------------------------------------------+   |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### Component Architecture

```
+------------------------------------------------------------------+
|                         App Module                                |
|  +------------------------------------------------------------+  |
|  |  AppController          AppService                         |  |
|  |  - GET /api/health      - getHealth()                      |  |
|  +------------------------------------------------------------+  |
+----------------------------------+-------------------------------+
                                   |
     +----------+------------------+------------------+----------+
     |          |                  |                  |          |
     v          v                  v                  v          v
+----------+ +----------+ +-------------+ +------------+ +--------+
|   Auth   | | Catalog  | |Documentation| |Environments| |Plugin  |
|  Module  | |  Module  | |   Module    | |   Module   | |Manager |
|          | |          | |             | |            | |        |
| AuthCtrl | | CatCtrl  | |  DocCtrl    | | EnvCtrl    | |Registry|
| AuthSvc  | | CatSvc   | |  DocSvc     | | EnvSvc     | |        |
| User     | | Component| |  Doc Entity | | DeployCtrl | |        |
| DTOs     | | DTOs     | |  DTOs       | | DeploySvc  | |        |
|          | |          | |             | | Env Entity | |        |
|          | |          | |             | | Deploy Ent | |        |
+----------+ +----------+ +-------------+ +------------+ +--------+
```

## Module Design

### Auth Module

**Purpose**: Handle user authentication and management.

**Components**:

| Component | Responsibility |
|-----------|---------------|
| AuthController | HTTP request handling for auth endpoints |
| AuthService | User registration, login, and lookup logic |
| User Entity | User data structure |
| RegisterUserDto | Validation for registration requests |
| LoginDto | Validation for login requests |

**Data Flow**:

```
Registration:
Client -> AuthController.register() -> AuthService.register() -> Store in Map

Login:
Client -> AuthController.login() -> AuthService.login() -> Validate + Generate Token

List Users:
Client -> AuthController.findAll() -> AuthService.findAll() -> Return from Map
```

### Catalog Module

**Purpose**: Manage the software component catalog.

**Components**:

| Component | Responsibility |
|-----------|---------------|
| CatalogController | HTTP request handling for catalog endpoints |
| CatalogService | CRUD operations for components, YAML registration, git discovery |
| Component Entity | Component data structure with dependency relations |
| ComponentKind Enum | Types of components (20 kinds across 4 domains) |
| ComponentKindGroup Enum | Domain grouping (dev, infra, data, security) |
| ComponentLifecycle Enum | Lifecycle stages (planned, experimental, production, deprecated, decommissioned) |
| CreateComponentDto | Validation for create requests |
| UpdateComponentDto | Validation for update requests |
| CreateLocationDto | DTO for triggering git discovery |
| RegisterComponentYamlDto | DTO for manual YAML registration |

**Data Flow**:

```
Create Component:
Client -> CatalogController.create() -> CatalogService.create() -> TypeORM Repository

List Components (with optional kindGroup filter):
Client -> CatalogController.findAll(?kindGroup) -> CatalogService.findAll() -> TypeORM Repository

Discovery:
Client -> CatalogController.discover(url) -> CatalogService.discoverFromLocation() -> Clone + Parse YAML -> TypeORM Repository
```

### Documentation Module

**Purpose**: Manage technical documentation associated with components.

**Components**:

| Component | Responsibility |
|-----------|---------------|
| DocumentationController | HTTP request handling for documentation endpoints |
| DocumentationService | CRUD operations for documentation |
| Documentation Entity | Documentation data structure |
| CreateDocumentationDto | Validation for create requests |
| UpdateDocumentationDto | Validation for update requests |

**Data Flow**:

```
Create Documentation:
Client -> DocController.create() -> DocService.create() -> TypeORM Repository

Filter by Component:
Client -> DocController.findAll(componentId) -> DocService.findByComponent() -> TypeORM Repository
```

### Environments Module

**Purpose**: Manage deployment environments and track component deployments.

**Components**:

| Component | Responsibility |
|-----------|---------------|
| EnvironmentsController | HTTP request handling for environment management |
| EnvironmentsService | CRUD operations with name uniqueness validation |
| Environment Entity | Environment data structure (type, order, metadata) |
| DeploymentsController | HTTP request handling for deployments, matrix, and latest views |
| DeploymentsService | Deployment tracking with status transition validation |
| Deployment Entity | Deployment data structure linking components to environments |
| CreateEnvironmentDto | Validation for environment create requests |
| UpdateEnvironmentDto | Validation for environment update requests |
| CreateDeploymentDto | Validation for deployment create requests |
| UpdateDeploymentDto | Validation for deployment update requests |

**Data Flow**:

```
Record Deployment:
Client -> DeploymentsController.create() -> DeploymentsService.create() -> TypeORM Repository

Update Deployment Status:
Client -> DeploymentsController.update() -> DeploymentsService.update() -> Validate Transition -> TypeORM Repository

Deployment Matrix:
Client -> DeploymentsController.getMatrix() -> DeploymentsService.getMatrix() -> Query Latest per Component/Env
```

## Data Models

### User Entity

```typescript
class User {
  id: string;           // UUID
  username: string;     // Unique username
  email: string;        // Email address
  displayName: string;  // Display name
  roles: string[];      // User roles
  createdAt: Date;      // Creation timestamp
  updatedAt: Date;      // Last update timestamp
}
```

### Component Entity

```typescript
class Component {
  id: string;                     // UUID
  name: string;                   // Component name
  kind: ComponentKind;            // Type of component (20 kinds across 4 domains)
  description: string;            // Description
  owner: string;                  // Owner team/individual
  lifecycle: ComponentLifecycle;  // Lifecycle stage
  tags: string[];                 // Tags for categorization
  links: ComponentLink[];         // External links
  metadata: Record<string, unknown>; // Custom metadata
  dependsOn: Component[];        // Components this depends on
  dependedOnBy: Component[];     // Components that depend on this
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### Documentation Entity

```typescript
class Documentation {
  id: string;           // UUID
  title: string;        // Documentation title
  content: string;      // Documentation content
  componentId: string;  // Associated component ID
  author: string;       // Author
  version: string;      // Version string
  createdAt: Date;      // Creation timestamp
  updatedAt: Date;      // Last update timestamp
}
```

### Environment Entity

```typescript
class Environment {
  id: string;                        // UUID
  name: string;                      // Unique environment name
  description: string;               // Description
  type: EnvironmentType;             // development, staging, production, sandbox
  order: number;                     // Display order for sorting
  metadata: Record<string, unknown>; // Additional metadata (e.g., region, provider)
  createdAt: Date;                   // Creation timestamp
  updatedAt: Date;                   // Last update timestamp
}
```

### Deployment Entity

```typescript
class Deployment {
  id: string;                        // UUID
  version: string;                   // Version being deployed (e.g., "v2.3.1")
  status: DeploymentStatus;          // pending, in_progress, succeeded, failed, rolled_back
  deployedBy: string;                // Username or system that triggered the deploy
  commitSha: string;                 // Git commit SHA
  description: string;               // Notes about the deployment
  metadata: Record<string, unknown>; // Additional metadata (e.g., pipeline URL)
  componentId: string;               // FK to Component
  environmentId: string;             // FK to Environment
  startedAt: Date;                   // When the deployment started
  finishedAt: Date;                  // When the deployment finished
  createdAt: Date;                   // Creation timestamp
  updatedAt: Date;                   // Last update timestamp
}
```

## API Design

### Endpoint Structure

All endpoints follow RESTful conventions:

| Method | Path Pattern | Purpose |
|--------|--------------|---------|
| GET | /api/{resource} | List resources |
| GET | /api/{resource}/:id | Get single resource |
| POST | /api/{resource} | Create resource |
| PATCH | /api/{resource}/:id | Update resource |
| DELETE | /api/{resource}/:id | Delete resource |

### Request Validation

Farm uses class-validator decorators for request validation:

```typescript
export class CreateComponentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ComponentKind)
  kind: ComponentKind;

  @IsString()
  @IsNotEmpty()
  owner: string;
}
```

### Error Responses

Standard HTTP status codes are used for error responses:

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Authentication required |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Duplicate resource |

## Security Considerations

### Current Implementation

- Passwords are hashed with bcrypt before storage
- JWT-based authentication with Passport.js
- Role-based access control (RBAC) with `@Roles()` decorator
- All mutation endpoints require `admin` role

### Future Improvements

- Add API key support for service-to-service communication
- Support OAuth/SAML integration
- Implement rate limiting

## Scalability Considerations

### Current State

- PostgreSQL for production, SQLite for testing
- Single-instance deployment with Docker support
- TypeORM migrations for schema management

### Future Improvements

- Redis caching layer
- Horizontal scaling with load balancing
- Event-driven architecture for real-time updates

## Technology Choices

### Why NestJS?

- Strong TypeScript support
- Modular architecture
- Built-in dependency injection
- Extensive ecosystem
- Clear separation of concerns

### Why REST over GraphQL?

- Simpler implementation
- Better caching with HTTP
- Easier debugging
- Lower learning curve

## Deployment Architecture

### Development

```
Developer Machine
       |
       v
+------------------+
|  Farm Server     |
|  (npm start:dev) |
|  Port 3000       |
+------------------+
```

### Production (Future)

```
                    +------------------+
                    |  Load Balancer   |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                |                |
            v                v                v
      +---------+      +---------+      +---------+
      | Farm    |      | Farm    |      | Farm    |
      | Node 1  |      | Node 2  |      | Node 3  |
      +---------+      +---------+      +---------+
            |                |                |
            +----------------+----------------+
                             |
                    +--------v---------+
                    |    Database      |
                    |   (PostgreSQL)   |
                    +------------------+
                             |
                    +--------v---------+
                    |    Cache         |
                    |    (Redis)       |
                    +------------------+
```

## Conclusion

Farm is designed as a simple, modular developer portal that can grow with organizational needs. The current implementation provides core functionality with a clear path for future enhancements including database integration, improved security, and scalability features.
