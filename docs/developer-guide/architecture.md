# Architecture

This document describes the architecture of Farm, providing an overview of the system design and key components.

## Overview

Farm follows a modular architecture based on NestJS, a progressive Node.js framework. The application is organized into distinct modules, each responsible for a specific domain.

## High-Level Architecture

```
                    +------------------+
                    |   HTTP Client    |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   NestJS App     |
                    |  (Express/HTTP)  |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                |                |
            v                v                v
    +-------+------+  +------+-------+  +-----+--------+
    |    Auth      |  |   Catalog    |  | Documentation |
    |   Module     |  |    Module    |  |    Module    |
    +--------------+  +--------------+  +--------------+
```

## Module Structure

Farm consists of the following modules:

### App Module

The root module that bootstraps the application and imports all feature modules.

**Responsibilities:**

- Application bootstrapping
- Global configuration
- Health check endpoint

**Files:**

- `app.module.ts` - Module definition
- `app.controller.ts` - Health controller
- `app.service.ts` - Health service
- `main.ts` - Application entry point

### Auth Module

Handles user authentication and management.

**Responsibilities:**

- User registration
- User login and token generation
- User listing

**Components:**

| Component | Purpose |
|-----------|---------|
| `AuthController` | HTTP endpoints for auth operations |
| `AuthService` | Business logic for authentication |
| `User` entity | User data structure |
| `RegisterUserDto` | Registration request validation |
| `LoginDto` | Login request validation |

### Catalog Module

Manages the software component catalog.

**Responsibilities:**

- Component CRUD operations
- Component lifecycle management
- Component metadata storage

**Components:**

| Component | Purpose |
|-----------|---------|
| `CatalogController` | HTTP endpoints for catalog operations |
| `CatalogService` | Business logic for catalog management |
| `Component` entity | Component data structure |
| `CreateComponentDto` | Create request validation |
| `UpdateComponentDto` | Update request validation |

### Documentation Module

Manages technical documentation associated with components.

**Responsibilities:**

- Documentation CRUD operations
- Filtering by component
- Version management

**Components:**

| Component | Purpose |
|-----------|---------|
| `DocumentationController` | HTTP endpoints for documentation operations |
| `DocumentationService` | Business logic for documentation management |
| `Documentation` entity | Documentation data structure |
| `CreateDocumentationDto` | Create request validation |
| `UpdateDocumentationDto` | Update request validation |

## Request Flow

1. **HTTP Request**: Client sends HTTP request to the NestJS application
2. **Routing**: NestJS routes the request to the appropriate controller
3. **Validation**: DTOs validate incoming request data
4. **Controller**: Controller method handles the request
5. **Service**: Service performs business logic
6. **Storage**: Data is stored in memory (Map structures)
7. **Response**: Result is returned to the client

## Data Storage

Currently, Farm uses in-memory storage with JavaScript Map objects:

```typescript
private readonly components: Map<string, Component> = new Map();
```

**Characteristics:**

- Fast read and write operations
- Data does not persist across restarts
- Suitable for development and testing
- Production deployment will require database integration

## Validation

Farm uses `class-validator` for request validation:

```typescript
@IsString()
@IsNotEmpty()
name: string;

@IsEnum(ComponentKind)
kind: ComponentKind;
```

**Global Validation Pipe:**

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

## API Prefix

All API endpoints are prefixed with `/api`:

```typescript
app.setGlobalPrefix("api");
```

## Error Handling

NestJS provides built-in exception handling:

- `NotFoundException` - Resource not found (404)
- `ConflictException` - Duplicate resource (409)
- `UnauthorizedException` - Authentication failure (401)
- `BadRequestException` - Validation failure (400)

## Future Architecture Considerations

- **Database Integration**: Replace in-memory storage with a persistent database
- **Caching**: Add caching layer for frequently accessed data
- **Authentication Middleware**: Implement JWT-based authentication
- **Plugin System**: Allow extensibility through plugins
- **Event Bus**: Add event-driven communication between modules
