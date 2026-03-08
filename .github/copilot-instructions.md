# Copilot Instructions for Farm

Farm is an open-source developer portal platform (like Backstage) built with NestJS 11, TypeORM, and PostgreSQL. Use EN_US for all docs and code comments. No emojis.

## Commands

```bash
# Build
npm run build            # Compile to dist/

# Test
npm run test             # Unit tests (Jest, rootDir: src/)
npm run test:e2e         # E2E tests (supertest + SQLite in-memory)
npx jest --testPathPattern=auth  # Run tests matching a pattern
npx jest src/auth/__tests__/auth.service.spec.ts  # Single test file

# Lint & Format
npm run lint             # ESLint with auto-fix
npm run format           # Prettier

# Full check
make check               # format + lint + unit tests + e2e tests

# Migrations
npm run migration:generate  # Generate migration from entity changes
npm run migration:run       # Run pending migrations
npm run migration:revert    # Revert last migration

# Docker
make up-docker            # Start API + PostgreSQL (docker-compose)
make down-docker-clean    # Stop and remove volumes
make healthcheck          # curl /api/health
```

## Architecture

### Plugin System

All feature modules are registered as plugins through `PluginManagerModule.forRoot()` in `src/app.module.ts`. Each plugin is a standard NestJS module with metadata (name, version, description). To add a new feature module, register it as a plugin in the `forRoot()` call alongside the existing five: `core-catalog`, `core-documentation`, `core-auth`, `core-environments`, `core-teams`.

The `PluginManagerService` maintains an in-memory registry of plugins and supports menu/route contributions via `plugin.json` manifests.

### Module Layout

Feature modules live directly under `src/` (not in a `modules/` subdirectory):

- `src/auth/` - JWT authentication, local strategy, user entity, refresh token rotation
- `src/catalog/` - Software component registry with YAML discovery (Backstage-compatible `catalog-info.yaml`)
- `src/documentation/` - Markdown docs fetched from URLs, rendered/sanitized to HTML, tree navigation
- `src/environments/` - Environments and deployments with status state machine
- `src/teams/` - Team management with user membership (ManyToMany) and component ownership
- `src/common/` - Shared guards, filters, decorators, logger config, health checks
- `src/config/` - App configuration with Joi validation schema
- `src/plugin-manager/` - Plugin registry and discovery

### Auth Flow

1. `POST /api/auth/register` creates user with bcrypt-hashed password, default role `["user"]`
2. `POST /api/auth/login` validates credentials, returns JWT access token + refresh token (40-byte hex stored hashed)
3. `POST /api/auth/refresh` rotates refresh tokens; detects token reuse and clears all user tokens
4. Protected routes use `@UseGuards(JwtAuthGuard)` and optionally `@Roles('admin')` with `RolesGuard`
5. JWT payload: `{ sub: userId, username, roles }`

### Database

- **Primary**: PostgreSQL 16 (TypeORM, auto-loaded entities)
- **Tests**: SQLite in-memory (`:memory:`, `synchronize: true`)
- **Migrations**: `src/migrations/` - always use migrations for schema changes in production (`DATABASE_SYNC=false`)
- **Config env vars**: `DATABASE_TYPE`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SYNC`

### Key Entities and Relationships

- `User` has ManyToMany with `Team` via `team_members` join table
- `Component` has ManyToMany self-referential `dependencies` via `component_dependencies` join table
- `Component` has ManyToOne `Team` (optional `teamId` FK) plus a string `owner` field
- `Documentation` has tree hierarchy via `parentId` + `order` fields
- `Deployment` has ManyToOne to both `Component` and `Environment`

## Conventions

### API

- Global prefix: `/api` (set in `main.ts`)
- Swagger UI: `/api/docs` (auto-generated via `@nestjs/swagger` plugin in `nest-cli.json`)
- REST pattern: `GET/POST /api/{resource}`, `GET/PATCH/DELETE /api/{resource}/:id`
- Rate limiting: global `ThrottlerGuard` (configurable via `THROTTLE_TTL`, `THROTTLE_LIMIT`); auth endpoints override with stricter limits

### Error Responses

All exceptions pass through `AllExceptionsFilter` (`src/common/filters/http-exception.filter.ts`) and return:

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/resource",
  "message": "Description of the error"
}
```

### Validation

Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `enableImplicitConversion: true`. DTOs use `class-validator` decorators. Sensitive fields use `@Exclude()` from `class-transformer` (applied via global `ClassSerializerInterceptor`).

### Entities

- UUID primary keys (`@PrimaryGeneratedColumn('uuid')`)
- `@CreateDateColumn()` and `@UpdateDateColumn()` on all entities
- Enum columns for type fields (e.g., `ComponentKind`, `ComponentLifecycle`, `TeamType`)
- Passwords hashed in `@BeforeInsert()` hook with bcrypt (10 rounds)

### Testing

- **Unit tests**: `src/**/*.spec.ts` - use `Test.createTestingModule` with mock repositories (`jest.fn()` for each method) and mock services. Reset mocks in `afterEach()`.
- **E2E tests**: `test/*.e2e-spec.ts` - use `createE2EApp()` and `registerAndLogin()` helpers from `test/helpers/e2e-setup.ts`. These configure SQLite in-memory and return a JWT token with admin role.
- **E2E helper pattern**: `registerAndLogin(app)` registers a user, promotes to admin via direct DB update, logs in, and returns the JWT token.

### Configuration

Environment variables validated at startup with Joi (`src/config/configuration.ts`). `JWT_SECRET` must be at least 32 characters in production. All config has sensible defaults for local development.

### Logging

Winston via `nest-winston`. Development: colored console. Production: JSON console + daily-rotate file transports (`logs/application-%DATE%.log`, `logs/error-%DATE%.log`, 20MB max, 14-day retention).
