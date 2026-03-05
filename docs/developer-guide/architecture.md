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
             +---------------+----------------+
             |               |                |
             v               v                v
     +-------+------+  +------+-------+  +-----+--------+
     |    Auth      |  |   Catalog    |  | Documentation |
     |   Module     |  |    Module    |  |    Module    |
     +--------------+  +--------------+  +--------------+
             |               |                |
             +---------------+----------------+
                             |
                             v
                    +------------------+
                    |  Common Layer    |
                    | (Filters/Pipes)  |
                    +------------------+
```

## Module Structure

Farm consists of the following modules and layers:

### Common Layer

The common layer provides cross-cutting concerns that are shared across all modules.

**Responsibilities:**

- Global exception filtering
- Custom validation pipes
- Global interceptors
- Shared decorators

**Files:**

- `src/common/filters/http-exception.filter.ts` - Standardized error response handling

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
- YAML-driven component registration
- Discovery of components from git repositories

**Components:**

| Component | Purpose |
|-----------|---------|
| `CatalogController` | HTTP endpoints for catalog operations, including discovery |
| `CatalogService` | Business logic for catalog management and discovery |
| `Component` entity | Component data structure with dependency relations |
| `CreateComponentDto` | Create request validation |
| `UpdateComponentDto` | Update request validation |
| `CreateLocationDto` | DTO for triggering discovery |
| `RegisterComponentYamlDto` | DTO for manual YAML registration |

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
3. **YAML Processing**: If registering via YAML, the `CatalogService` uses `js-yaml` to parse and validate the `catalog-info.yaml` content.
4. **Validation**: DTOs validate incoming request data
5. **Controller**: Controller method handles the request
6. **Service**: Service performs business logic and interacts with repositories
7. **Storage**: Data is persisted in a PostgreSQL database (in-memory SQLite for tests)
8. **Response**: Result is returned to the client

## Data Storage

Farm uses **TypeORM** as its Object-Relational Mapper (ORM) to handle database interactions. By default, it is configured to use **PostgreSQL** for development and production environments.

**Key features:**

- **Persistence**: Data survives application restarts.
- **Relational Integrity**: Relationships between entities can be enforced.
- **Environment Flexibility**: Uses SQLite in-memory for E2E tests and PostgreSQL for actual deployments.
- **Asynchronous**: All database operations are non-blocking and use `async/await`.

## Validation

Farm uses `class-validator` for request validation at the DTO level.

**Global Validation Pipe Configuration:**

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

- `whitelist`: Strips properties that do not have any decorators in the DTO.
- `forbidNonWhitelisted`: Throws an error if non-whitelisted properties are present.
- `transform`: Automatically transforms payloads to be objects typed according to their DTO classes.
- `enableImplicitConversion`: Allows for automatic type conversion based on the TypeScript types in the DTO.

## API Prefix

All API endpoints are prefixed with `/api`:

```typescript
app.setGlobalPrefix("api");
```

## Error Handling

Farm uses a global exception filter (`AllExceptionsFilter`) to ensure all errors return a standardized JSON response.

**Response Format:**

```json
{
  "statusCode": 400,
  "timestamp": "2023-10-27T10:00:00.000Z",
  "path": "/api/catalog/components",
  "message": "Validation failed"
}
```

The filter catches both built-in NestJS exceptions (like `NotFoundException`, `ConflictException`, etc.) and generic errors, logging them with the appropriate context and returning a clean response to the client.

## Future Architecture Considerations

- **Caching**: Add caching layer for frequently accessed data (e.g., Redis).
- **Authentication Middleware**: Implement JWT-based authentication with Passport.js.
- **Plugin System**: Allow extensibility through plugins.
- **Event Bus**: Add event-driven communication between modules.
