# Farm - Copilot Instructions

Farm is an open-source developer portal platform built with NestJS + TypeScript + TypeORM + PostgreSQL. It is inspired by Backstage and provides a software catalog, technical documentation management, and authentication.

## Commands

```bash
npm run start:dev          # Start with hot reload
npm run build              # Compile TypeScript
npm run test               # Run all unit tests
npm run test:e2e           # Run end-to-end tests
npm run test:cov           # Run tests with coverage
npm run lint               # Lint and auto-fix
npm run format             # Format with Prettier

# Run a single test file
npx jest src/catalog/catalog.service.spec.ts

# Run tests matching a pattern
npx jest --testPathPattern=catalog

# Database migrations
npm run migration:generate  # Generate migration from entity changes
npm run migration:run       # Apply pending migrations
npm run migration:revert    # Revert last migration
```

## Architecture

The application uses a **plugin system** as its core extensibility pattern. Every major feature module (Catalog, Documentation, Auth) is registered as a `FarmPlugin` via `PluginManagerModule.forRoot()` in `app.module.ts`. A plugin is a NestJS module paired with `PluginMetadata` (name, version, description). New features should be added as plugins following this pattern.

```
src/
├── app.module.ts              # Root module; registers all plugins
├── main.ts                    # Bootstrap; global pipes/guards/filters/swagger
├── config/configuration.ts    # Env vars mapped to typed config object (validated with Joi)
├── plugin-manager/            # Plugin registry (global module)
├── auth/                      # JWT + Local Passport strategies, RBAC
├── catalog/                   # Software component catalog (Backstage-inspired)
├── documentation/             # Technical documentation linked to components
├── common/
│   ├── decorators/            # @Roles() decorator
│   ├── filters/               # AllExceptionsFilter (global)
│   ├── guards/                # JwtAuthGuard, RolesGuard
│   ├── health/                # Health check endpoints
│   └── logger/                # Winston logger factory
└── migrations/                # TypeORM migration files
```

**Catalog** — the central domain. Components have a `kind` (service, library, website, api, system, domain, resource) and `lifecycle` (experimental, production, deprecated). Components can depend on other components via a self-referencing M2M join table (`component_dependencies`). The service can auto-discover components by cloning a git repo and parsing `catalog-info.yaml` files (Backstage-compatible format).

**Database** — PostgreSQL in production, SQLite (`sqlite3`) available for tests. `DATABASE_SYNC=true` enables auto-sync in development; migrations run automatically in production (`NODE_ENV=production`).

## Key Conventions

### Authentication and Authorization
All endpoints are protected by default with `JwtAuthGuard` + `RolesGuard` applied at the controller level. Use the `@Roles('admin')` decorator from `src/common/decorators/roles.decorator.ts` to restrict specific endpoints to roles. Roles are stored as a `simple-array` column on the `User` entity.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('my-resource')
export class MyController {
  @Post()
  @Roles('admin')
  create() { ... }
}
```

### Global Pipes and Interceptors
`ValidationPipe` is applied globally with `whitelist: true` and `forbidNonWhitelisted: true` — DTOs must use `class-validator` decorators. `ClassSerializerInterceptor` is applied globally — use `@Exclude()` on entity fields (e.g., `password`) to strip them from responses automatically.

### Swagger Documentation
Every controller must use `@ApiTags()`, and every endpoint must use `@ApiOperation()` and `@ApiResponse()` decorators. Common error responses (400, 401, 403, 500) are declared at the controller class level; endpoint-specific responses (200, 201, 404) go on the method.

### Entity Patterns
- UUIDs via `@PrimaryGeneratedColumn('uuid')`
- Always include `@CreateDateColumn()` and `@UpdateDateColumn()`
- Arrays stored with `'simple-array'`, JSON objects with `'simple-json'`
- Decorate all entity properties with `@ApiProperty()` for Swagger schema generation

### Configuration Access
Use `ConfigService` with dot-notation keys matching the object returned by `configuration()` in `src/config/configuration.ts`. Example: `configService.get<string>('auth.jwtSecret')`. Never access `process.env` directly outside of `configuration.ts`.

### Logging
Use NestJS `Logger` with the class name as context: `private readonly logger = new Logger(MyService.name)`. Do not use `console.log`.

### Language
All code comments and documentation must be written in English (EN-US). Do not use emojis in code or comments.

### Testing
Unit tests live alongside the source file (e.g., `catalog.service.spec.ts`) or in a `__tests__/` subdirectory (e.g., `auth/__tests__/`). E2E tests are in `test/`. Use `@nestjs/testing` `TestingModule` for unit tests; mock TypeORM repositories with `getRepositoryToken()`.
