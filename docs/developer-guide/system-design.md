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
|  |  +----------+  +-----------+  +-------------+              |  |
|  |  |   Auth   |  |  Catalog  |  | Documentation|              |  |
|  |  |  Module  |  |   Module  |  |    Module   |              |  |
|  |  +----+-----+  +-----+-----+  +------+------+              |  |
|  |       |              |               |                      |  |
|  |  +----v--------------v---------------v----+                |  |
|  |  |           In-Memory Storage            |                |  |
|  |  |     (Map<string, Entity> instances)    |                |  |
|  |  +----------------------------------------+                |  |
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
         +-------------------------+-------------------------+
         |                         |                         |
         v                         v                         v
+----------------+       +----------------+       +------------------+
|   Auth Module  |       | Catalog Module |       | Documentation    |
|                |       |                |       |     Module       |
| AuthController |       | CatalogController      | DocController    |
| AuthService    |       | CatalogService |       | DocService       |
| User Entity    |       | Component Entity       | Documentation    |
| DTOs           |       | DTOs           |       | DTOs             |
+----------------+       +----------------+       +------------------+
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
| CatalogService | CRUD operations for components |
| Component Entity | Component data structure |
| ComponentKind Enum | Types of components |
| ComponentLifecycle Enum | Lifecycle stages |
| CreateComponentDto | Validation for create requests |
| UpdateComponentDto | Validation for update requests |

**Data Flow**:

```
Create Component:
Client -> CatalogController.create() -> CatalogService.create() -> Store in Map

Get Component:
Client -> CatalogController.findOne() -> CatalogService.findOne() -> Lookup in Map

Update Component:
Client -> CatalogController.update() -> CatalogService.update() -> Modify in Map

Delete Component:
Client -> CatalogController.remove() -> CatalogService.remove() -> Remove from Map
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
Client -> DocController.create() -> DocService.create() -> Store in Map

Filter by Component:
Client -> DocController.findAll(componentId) -> DocService.findByComponent() -> Filter Map
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
  kind: ComponentKind;            // Type of component
  description: string;            // Description
  owner: string;                  // Owner team/individual
  lifecycle: ComponentLifecycle;  // Lifecycle stage
  tags: string[];                 // Tags for categorization
  links: ComponentLink[];         // External links
  metadata: Record<string, unknown>; // Custom metadata
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

- Passwords are hashed with SHA-256 before storage
- Session tokens are UUIDs generated at login

### Future Improvements

- Implement JWT-based authentication
- Add password strength validation
- Implement rate limiting
- Add API key support for service-to-service communication
- Support OAuth/SAML integration

## Scalability Considerations

### Current Limitations

- In-memory storage limits data persistence
- Single-instance deployment
- No caching layer

### Future Improvements

- Database integration (PostgreSQL, MongoDB)
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

### Why In-Memory Storage?

- Rapid prototyping
- No external dependencies for development
- Simplifies testing
- Easy to replace with database later

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
