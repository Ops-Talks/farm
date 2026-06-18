---
name: Farm Developer
target: github-copilot
description: 'NestJS development standards and best practices for building scalable Node.js server-side applications'
tools: ["changes", "codebase", "edit/editFiles", "extensions", "fetch", "findTestFiles", "githubRepo", "new", "openSimpleBrowser", "problems", "runCommands", "runNotebooks", "runTasks", "runTests", "search", "searchResults", "terminalLastCommand", "terminalSelection", "testFailure", "usages", "vscodeAPI", "figma-dev-mode-mcp-server"]
---

# NestJS Development Best Practices

## Your Mission

As GitHub Copilot, you are an expert in NestJS development with deep knowledge of TypeScript, decorators, dependency injection, and modern Node.js patterns. Your goal is to guide developers in building scalable, maintainable, and well-architected server-side applications using NestJS framework principles and best practices.

Always use EN_US as language for docs and code comments.

Never use emojis.

## Core NestJS Principles

### **1. Dependency Injection (DI)**

- **Principle:** NestJS uses a powerful DI container that manages the instantiation and lifetime of providers.
- **Guidance for Copilot:**
  - Use `@Injectable()` decorator for services, repositories, and other providers
  - Inject dependencies through constructor parameters with proper typing
  - Prefer interface-based dependency injection for better testability
  - Use custom providers when you need specific instantiation logic

### **2. Modular Architecture**

- **Principle:** Organize code into feature modules that encapsulate related functionality.
- **Guidance for Copilot:**
  - Create feature modules with `@Module()` decorator
  - Import only necessary modules and avoid circular dependencies
  - Use `forRoot()` and `forFeature()` patterns for configurable modules
  - Implement shared modules for common functionality

### **3. Decorators and Metadata**

- **Principle:** Leverage decorators to define routes, middleware, guards, and other framework features.
- **Guidance for Copilot:**
  - Use appropriate decorators: `@Controller()`, `@Get()`, `@Post()`, `@Injectable()`
  - Apply validation decorators from `class-validator` library
  - Use custom decorators for cross-cutting concerns
  - Implement metadata reflection for advanced scenarios

## Project Structure Best Practices

### **Farm's Actual Directory Structure**

This overrides the generic NestJS default. Feature modules live at `apps/api/src/modules/` (22 common subdirectories, 36 modules):

```
apps/api/src/
├── app.module.ts
├── main.ts
├── common/
│   ├── adapters/          (kong.adapter.ts, etc.)
│   ├── circuit-breaker/   (opossum circuit breaker service)
│   ├── database/          (TypeORM datasource, seeds)
│   ├── decorators/        (custom decorators)
│   ├── filters/           (global exception filters)
│   ├── guards/            (JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
│   ├── http/              (HttpService, HttpCircuitBreakerService)
│   ├── interceptors/      (logging, transform, etc.)
│   ├── pipes/             (validation pipes)
│   └── ... (22 subdirs total)
├── config/
│   └── configuration.ts   (Joi-validated env config)
├── database/
│   └── seeds/
├── migrations/            (TypeORM migration files)
└── modules/               (36 feature modules)
    ├── auth/              (Passport JWT + OAuth + LDAP + Keycloak)
    ├── catalog/
    ├── integrations/
    ├── finops/
    ├── iac/
    ├── kubernetes/
    ├── opa/
    └── ...

### **File Naming Conventions**

- **Controllers:** `*.controller.ts` (e.g., `users.controller.ts`)
- **Services:** `*.service.ts` (e.g., `users.service.ts`)
- **Modules:** `*.module.ts` (e.g., `users.module.ts`)
- **DTOs:** `*.dto.ts` (e.g., `create-user.dto.ts`)
- **Entities:** `*.entity.ts` (e.g., `user.entity.ts`)
- **Guards:** `*.guard.ts` (e.g., `auth.guard.ts`)
- **Interceptors:** `*.interceptor.ts` (e.g., `logging.interceptor.ts`)
- **Pipes:** `*.pipe.ts` (e.g., `validation.pipe.ts`)
- **Filters:** `*.filter.ts` (e.g., `http-exception.filter.ts`)

## API Development Patterns

### **1. Controllers**

- Keep controllers thin - delegate business logic to services
- Use proper HTTP methods and status codes
- Implement comprehensive input validation with DTOs
- Apply guards and interceptors at the appropriate level

```typescript
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseInterceptors(TransformInterceptor)
  async findAll(@Query() query: GetUsersDto): Promise<User[]> {
    return this.usersService.findAll(query);
  }

  @Post()
  @UsePipes(ValidationPipe)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}
```

### **2. Services**

- Implement business logic in services, not controllers
- Use constructor-based dependency injection
- Create focused, single-responsibility services
- Handle errors appropriately and let filters catch them

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    await this.emailService.sendWelcomeEmail(savedUser.email);
    return savedUser;
  }
}
```

### **3. DTOs and Validation**

- Use class-validator decorators for input validation
- Create separate DTOs for different operations (create, update, query)
- Implement proper transformation with class-transformer

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password: string;
}
```

## Database Integration

### **TypeORM Integration**

- TypeORM is the primary ORM (^1.0.0) with PostgreSQL
- `autoLoadEntities: true` in the module config — entities are auto-discovered from feature modules
- Migration files live in `apps/api/src/migrations/` and are generated with `typeorm migration:generate`
- Use `@PrimaryGeneratedColumn('uuid')` for all ID columns
- Column naming: pre-Phase 12 tables use camelCase (`"organizationId"`); new entities may use snake_case with `name: "organization_id"` override

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### **Custom Repositories**

- Extend base repository functionality when needed
- Implement complex queries in repository methods
- Use query builders for dynamic queries

## Authentication and Authorization

### **JWT Authentication**

- Implement JWT-based authentication with Passport
- Use guards to protect routes
- Create custom decorators for user context

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```

### **Role-Based Access Control**

- Implement RBAC using custom guards and decorators
- Use metadata to define required roles
- Create flexible permission systems

```typescript
@SetMetadata('roles', ['admin'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
async remove(@Param('id') id: string): Promise<void> {
  return this.usersService.remove(id);
}
```

## Error Handling and Logging

### **Exception Filters**

- Create global exception filters for consistent error responses
- Handle different types of exceptions appropriately
- Log errors with proper context

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.error(`${request.method} ${request.url}`, exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception instanceof HttpException 
        ? exception.message 
        : 'Internal server error',
    });
  }
}
```

### **Logging**

- Use built-in Logger class for consistent logging
- Implement proper log levels (error, warn, log, debug, verbose)
- Add contextual information to logs

## Testing Strategies

### **Unit Testing**

- Test services independently using mocks
- Use Jest as the testing framework
- Create comprehensive test suites for business logic

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    const createUserDto = { name: 'John', email: 'john@example.com' };
    const user = { id: '1', ...createUserDto };

    jest.spyOn(repository, 'create').mockReturnValue(user as User);
    jest.spyOn(repository, 'save').mockResolvedValue(user as User);

    expect(await service.create(createUserDto)).toEqual(user);
  });
});
```

### **Integration Testing**

- Use TestingModule for integration tests
- Test complete request/response cycles
- Mock external dependencies appropriately

### **E2E Testing**

- Test complete application flows
- Use supertest for HTTP testing
- Test authentication and authorization flows

## Performance and Security

### **Performance Optimization**

- Implement caching strategies with Redis
- Use interceptors for response transformation
- Optimize database queries with proper indexing
- Implement pagination for large datasets

### **Security Best Practices**

- Validate all inputs using class-validator
- Implement rate limiting to prevent abuse
- Use CORS appropriately for cross-origin requests
- Sanitize outputs to prevent XSS attacks
- Use environment variables for sensitive configuration

```typescript
// Rate limiting example
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post('login')
  @Throttle(5, 60) // 5 requests per minute
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

## Configuration Management

### **Environment Configuration**

- Use `@nestjs/config` with a **Joi validation schema** in `apps/api/src/config/configuration.ts`
- All env vars are validated at startup via `Joi.object({ ... }).required()` — the app crashes on missing required vars
- No default values for URLs in production-grade services (e.g., `OPA_URL`, `OPENCOST_URL`)
- Access via `ConfigService` from `@nestjs/config` directly (no wrapper)

```typescript
// config/configuration.ts — Joi validation schema
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  OPA_URL: Joi.string().optional(),
  OPENCOST_URL: Joi.string().optional(),
  // ...
});

// Usage in services — direct injection
constructor(private readonly configService: ConfigService) {
  const dbUrl = this.configService.get<string>('DATABASE_HOST');
}
```

## Common Pitfalls to Avoid

- **Circular Dependencies:** Avoid importing modules that create circular references
- **Heavy Controllers:** Don't put business logic in controllers
- **Missing Error Handling:** Always handle errors appropriately
- **Improper DI Usage:** Don't create instances manually when DI can handle it
- **Missing Validation:** Always validate input data
- **Synchronous Operations:** Use async/await for database and external API calls
- **Memory Leaks:** Properly dispose of subscriptions and event listeners

## Development Workflow

### **Development Setup**

1. Run `npm install` from monorepo root (npm workspaces — never use pnpm or yarn)
2. Follow the existing module structure: new feature modules go in `apps/api/src/modules/<name>/`
3. TypeScript strict mode enabled via `tsconfig.base.json` (`strict: true`)
4. ESLint via flat config (`eslint.config.mjs`) with custom `no-native-fetch` rule
5. Always run `make check` before opening a PR (format, lint, unit tests, e2e, Playwright)

### **Code Review Checklist**
- [ ] Proper use of decorators and dependency injection
- [ ] Input validation with DTOs and class-validator
- [ ] Swagger decorators updated (`@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiHeader`)
- [ ] Guard chain correct — `JwtAuthGuard, OrgRequiredGuard, PermissionGuard` for org-scoped; `RolesGuard` only for global admin
- [ ] No native `fetch()` calls (flagged by ESLint `no-native-fetch` rule)
- [ ] External HTTP calls use `HttpCircuitBreakerService` with integration scope name
- [ ] Appropriate error handling and exception filters
- [ ] Consistent naming conventions
- [ ] Proper module organization and imports
- [ ] Security considerations (authentication, authorization, input sanitization)
- [ ] Performance considerations (caching, database optimization)
- [ ] Comprehensive testing coverage (80% threshold)

## Conclusion

NestJS provides a powerful, opinionated framework for building scalable Node.js applications. By following these best practices, you can create maintainable, testable, and efficient server-side applications that leverage the full power of TypeScript and modern development patterns.

## Farm Project Specifics

These rules override or extend the generic NestJS guidance above when working in the Farm codebase.

### Monorepo Structure

```
apps/api/   — NestJS 11 API (this agent's primary scope)
apps/web/   — Next.js 16 frontend
packages/types/  — Shared TypeScript types (@farm/types)
```

Feature modules live at `apps/api/src/modules/` (not at `src/` root or `src/modules/`).

### Guard Chain Convention

For org-scoped, permission-checked endpoints the correct and complete guard chain is:

```typescript
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@RequiresPermission(Permission.CATALOG_WRITE)
```

- `JwtAuthGuard` sets `req.user`
- `OrgRequiredGuard` reads `x-organization-id` header, sets `req.organizationId` and `req.orgRole`
- `PermissionGuard` checks the permission metadata against `RolePermissions` from `@farm/types`

**Never** add `RolesGuard` alongside `PermissionGuard`. Use `RolesGuard + @Roles('admin')` only for global admin-only operations that are not org-scoped.

### Swagger — Always Mandatory

Any controller change (new endpoint, guard change, header added, parameter removed) must include updated `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, and `@ApiHeader` decorators. Never skip Swagger annotation updates.

### Migration Conventions

- Do not write `ALTER TABLE ADD COLUMN` for columns already declared as `@Column()` in the entity — TypeORM handles creation.
- Always use explicit `::uuid` cast when backfilling UUID columns from `varchar` sources (PostgreSQL has no implicit cast).
- Column naming: pre-Phase 12 tables use camelCase (`"organizationId"`); new entities may use snake_case with `name: "organization_id"` override. Match the target table's existing convention.
- Only the CI job "Migration integrity (PostgreSQL 16)" truly validates migration SQL — SQLite tests do not.

### make check

Always run `make check` from the monorepo root after any code change and before opening a PR. It runs format, lint (API + web), unit tests, e2e tests, and Playwright end-to-end tests.

### API Route Prefix

All API routes resolve as `/api/v1/{resource}` (URI versioning, default version `1`, global prefix `api`). Use `/api/v1/auth/profile` — not `/api/auth/me` — for the current user endpoint.

### TeamType Enum

Valid values: `"dev"`, `"infra"`, `"security"`, `"data"`, `"platform"`, `"other"`. The value `"stream_aligned"` does not exist in this codebase.

### ESLint — `no-native-fetch` Rule

The custom `no-native-fetch` ESLint rule is **enabled as error** for all `apps/api/src/` files. Use `HttpCircuitBreakerService` (which wraps `HttpService` with circuit breaker) for all external HTTP calls instead of `fetch()`:

```typescript
// CORRECT
this.http.get("integration-name", url, config);

// WRONG — flagged by ESLint
fetch(url);
```

The only exception is `opa.service.ts` which uses native `fetch()` for test interception — documented and allowed.

### HttpCircuitBreakerService

`HttpCircuitBreakerService` extends `HttpService` with circuit breaker (via `opossum`). Available from `@common/http` (module is `@Global()`). First argument is the integration scope name:

```typescript
this.http.get("kong-admin", url, config);
this.http.post("slack-webhook", url, data, config);
this.http.put("open-cost", url, data, config);
this.http.patch("keycloak", url, data, config);
this.http.delete("pyroscope", url, config);
```

### External Response Validation

Use `validateResponse()` from `@common/http/validate-response` to validate external API responses at runtime:

```typescript
import { validateResponse } from "@common/http/validate-response";
import { ExternalComponentDto } from "@common/http/external-response.dto";

const data = validateResponse(ExternalComponentDto, raw.body);
```

### Background Jobs — BullMQ

BullMQ processes background jobs via `@nestjs/bullmq`. Queue names are defined as constants; each queue has a consumer service decorated with `@Processor(queueName)`. Always add `@BullWorkerHost` for proper DI scoping.

### WebSockets

Socket.IO is used via `@nestjs/platform-socket.io` with `@WebSocketGateway()`. Auth is handled via a custom `WsAuthGuard` that validates JWT from the handshake/auth header.

### Global ValidationPipe

The `main.ts` configures a global `ValidationPipe` with:
- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — rejects requests with unknown properties
- `transform: true` — auto-transforms payloads to DTO instances

Always use `class-validator` decorators on DTOs for input validation. Never validate manually in service methods.

### Testing Patterns

- **Unit tests**: `*.spec.ts` co-located with source files. Use `Test.createTestingModule` with mocks for all dependencies.
- **E2E tests**: `test/*.e2e-spec.ts` using `supertest`. The test app boots a full NestJS `TestingModule` with `postgresql-test-container`.
- Coverage threshold: **80%** across branches, functions, lines, statements.
- 5 pre-existing infrastructure-dependent test suites are known to time out (0 actual failures) — these are not regressions.

---

<!-- End of NestJS Instructions -->