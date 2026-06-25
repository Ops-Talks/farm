# NestJS Best Practices Remediation — Design Spec

**Date:** 2026-06-20
**Scope:** 4 phases, 9 epics, 36 stories
**Approach:** Crescente por dificuldade (A)

---

## Context

Análise da arquitetura NestJS da API identificou 10 gaps contra melhores práticas. Um deles (bufferLogs) já está resolvido — restam 9 gaps reais, agrupados em 4 fases ordenadas por dificuldade crescente.

---

## Phase 60: Dev Experience & Build

### Epic FARM-E60.1 — ESLint `no-explicit-any`

**Gap:** `eslint.config.mjs:151` seta `@typescript-eslint/no-explicit-any: 'off'`. Apenas 11 ocorrências reais de tipo `any` em 4 arquivos de produção.

**Arquivos afetados:**

| Arquivo | Ocorrências | Tipo do problema |
|---------|------------|-----------------|
| `common/http/http-circuit-breaker.service.ts` | 8 | `T = any` (default generic), `data?: any` (request body) |
| `modules/auth/strategies/local.strategy.ts` | 1 | `Promise<any>` — deve ser `Promise<User>` |
| `modules/catalog/entities/component.entity.ts` | 1 | `team: any` — deve ser `team: Team` |
| `modules/plugin-manager/interfaces/plugin.interface.ts` | 1 | `Type<any>` — pode ser `Type<unknown>` |

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S60.01 | Enable `no-explicit-any` as warn, fix 4 files, promote to error | Habilitar regra como `'warn'`, corrigir os 11 `any`s nos 4 arquivos, promover para `'error'` |
| FARM-S60.02 | Add CI guard to prevent rule regression | Adicionar verificação no `make check` que garante que a regra permanece `'error'` |

---

### Epic FARM-E60.2 — ESM Build Modernization

**Gap:** `tsconfig.build.json` sobrescreve para `module: "commonjs"` e `moduleResolution: "node10"` enquanto `tsconfig.json` usa `nodenext`. 4 `require()` calls e 5 `__dirname` usages bloqueiam ESM puro.

**Bloqueadores conhecidos:**
- `passport-ldapauth` — dynamic `require()` no `ldap.strategy.ts:9`, sem export ESM
- `@pyroscope/nodejs` — dynamic `require()` no `pyroscope-init.service.ts:19`, depende de addon nativo

**Arquivos com `require()`:**

| Arquivo | Linha | Conteúdo |
|---------|-------|----------|
| `common/swagger/swagger-config.ts` | 4 | `require("../../../package.json")` |
| `config/configuration.ts` | 3 | `require("../../package.json")` |
| `modules/auth/strategies/ldap.strategy.ts` | 9 | `require("passport-ldapauth")` |
| `modules/observability/pyroscope-init.service.ts` | 19 | `require("@pyroscope/nodejs")` |

**Arquivos com `__dirname`:**

| Arquivo | Propósito |
|---------|-----------|
| `app.module.ts:131` | TypeORM migrations path |
| `common/email/email.service.ts:106` | Template directory |
| `modules/plugin-manager/services/plugin-validator.service.ts:37` | Package version read |
| `database/seeds/seed.data-source.ts:8,10` | .env loading |

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S60.03 | Replace `require(package.json)` with `createRequire` or `fs.readFileSync` | Converter 2 leituras de `package.json` para `createRequire(import.meta.url)` |
| FARM-S60.04 | Replace `__dirname` with `import.meta.url` + `fileURLToPath` | Substituir 5 usos de `__dirname` por equivalentes ESM |
| FARM-S60.05 | Convert tsconfig.build.json to ESM output | Alterar `module` e `moduleResolution` para `nodenext`, adicionar `"type": "module"` no `package.json` |
| FARM-S60.06 | Use `createRequire` for CJS-only dependencies | Criar wrapper `createRequire` para `passport-ldapauth` e `@pyroscope/nodejs` |

---

## Phase 61: NestJS Code Quality

### Epic FARM-E61.1 — Repository Pattern in OrgRequiredGuard

**Gap:** `org-required.guard.ts:42` injeta `DataSource` diretamente via `@Inject(getDataSourceToken())` e faz `dataSource.getRepository(UserOrganization)`. O guard irmão `OrgRolesGuard` já usa `@InjectRepository(UserOrganization)` — inconsistência entre guards que fazem a mesma query.

**Situação atual:**
- `OrgRequiredGuard`: `@Inject(getDataSourceToken())` — **incorreto**
- `OrgRolesGuard`: `@InjectRepository(UserOrganization)` — **correto**
- Demais 4 guards: sem acesso a DB

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S61.01 | Replace DataSource injection with @InjectRepository | Substituir `@Inject(getDataSourceToken())` por `@InjectRepository(UserOrganization)` no `OrgRequiredGuard` |
| FARM-S61.02 | Register UserOrganization in guard provider module | Adicionar `TypeOrmModule.forFeature([UserOrganization])` no módulo que provê o guard |
| FARM-S61.03 | Update OrgRequiredGuard unit tests | Refatorar testes para mockar repository em vez de DataSource |

---

### Epic FARM-E61.2 — App Module Modularization

**Gap:** `app.module.ts` com 569 linhas, 421 no array `imports`. Módulos de infraestrutura importados individualmente sem composição. `OrganizationModule` importado duplicado (linha 145 direto + linha 267 via PluginManagerModule).

**Módulos atualmente importados individualmente (não-agrupados):**
- ConfigModule, EventEmitterModule, ScheduleModule, PrometheusModule
- TypeOrmModule, CacheModule, QueuesModule, ThrottlerModule
- DatabaseModule, DatabaseMetricsModule, BusinessMetricsModule
- CircuitBreakerModule, HttpModule, HealthModule
- ObservabilityModule, EventsModule, EmailModule

**Agrupamento proposto:**

| Módulo composto | Módulos internos | Propósito |
|----------------|-----------------|-----------|
| `ObservabilityInfraModule` | PrometheusModule, BusinessMetricsModule, DatabaseMetricsModule, ObservabilityModule, MetricsInterceptor, metric providers | Métricas e tracing |
| `DataInfraModule` | TypeOrmModule, DatabaseModule, CacheModule, QueuesModule | Persistência e cache |
| `SecurityInfraModule` | CircuitBreakerModule, HttpModule, ThrottlerModule, PerUserThrottlerGuard | HTTP externo e rate limiting |

**Mantidos direto no AppModule:**
- ConfigModule, EventEmitterModule, ScheduleModule
- HealthModule, EventsModule, EmailModule
- PluginManagerModule.forRoot(...)

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S61.04 | Extract ObservabilityInfraModule | Agrupar 6 módulos + providers de métricas em `ObservabilityInfraModule` |
| FARM-S61.05 | Extract DataInfraModule | Agrupar TypeOrmModule, DatabaseModule, CacheModule, QueuesModule em `DataInfraModule` |
| FARM-S61.06 | Extract SecurityInfraModule | Agrupar CircuitBreakerModule, HttpModule, ThrottlerModule, PerUserThrottlerGuard em `SecurityInfraModule` |
| FARM-S61.07 | Remove duplicate OrganizationModule import | Manter apenas no PluginManagerModule.forRoot(), remover da linha 145 |
| FARM-S61.08 | Move APP_GUARD and APP_INTERCEPTOR to extracted modules | Centralizar providers globais nos módulos extraídos |

---

### Epic FARM-E61.3 — Plugin Layer Simplification

**Gap:** 34 módulos core registrados no `PluginManagerModule.forRoot()` com metadata (name, version, description) duplicada fora dos arquivos de módulo. Plugin #14 `cloud` sem prefixo `"core-"`, inconsistente com os demais.

**Problema:** A metadata existe **apenas** em `app.module.ts` (linhas 218-509). Nenhum módulo core exporta seu próprio `PluginMetadata`. Se a metadata do plugin em `app.module.ts` divergir do JSDoc do módulo, não há garantia de consistência.

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S61.09 | Move plugin metadata into each module | Cada módulo exporta constante (ex: `CATALOG_PLUGIN_METADATA`) com name/version/description |
| FARM-S61.10 | Refactor PluginManagerModule.forRoot() to reference module metadata | `forRoot()` aceita `XxxModule` que exporta sua própria metadata, eliminando duplicação |
| FARM-S61.11 | Fix cloud plugin name to core-cloud | Corrigir inconsistência de nomenclatura do plugin cloud |
| FARM-S61.12 | Update frontend consumer if name changes | Verificar e atualizar frontend que lê `/api/v1/plugins` |

---

## Phase 62: API Docs & DB Hygiene

### Epic FARM-E62.1 — Swagger @ApiProperty Coverage

**Gap:** 2 DTOs com zero `@ApiProperty`. Muitos DTOs têm `@ApiProperty()` vazio sem `description`, `example`, ou `enum`. Nenhuma validação automatizada no CI.

**DTOs sem NENHUM @ApiProperty:**

| Arquivo | Campos | 
|---------|--------|
| `modules/istio/dto/patch-weights.dto.ts` | 3 (`destination`, `weight`, `weights`) |
| `modules/search/dto/update-search-config.dto.ts` | 4 (`titleBoost`, `tagsBoost`, `descriptionBoost`, `fuzziness`) |

**DTOs com @ApiProperty vazio (sem description):** Estima-se ~50 classes em módulos de alta prioridade (catalog, auth, pipelines, environments, slo, incident).

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S62.01 | Add @ApiProperty to 2 DTOs with zero coverage | Adicionar decorators nos `patch-weights.dto.ts` e `update-search-config.dto.ts` (7 campos) |
| FARM-S62.02 | Add CI validation for Swagger coverage | Adicionar script/make target que gera `openapi.json` e valida endpoints sem documentação |
| FARM-S62.03 | Enhance @ApiProperty with descriptions and enums | Adicionar `description`, `enum`, `example` nos DTOs de alta prioridade (~50 classes) |

---

### Epic FARM-E62.2 — Column Naming Unification

**Gap:** 51 entidades, 386 colunas. 14.5% com `name:` explícito snake_case, 85.5% sem `name:` (TypeORM default camelCase). Entidades como Pipeline, Deployment, Component têm MIX de camelCase e snake_case na **mesma tabela**. Nenhuma `namingStrategy` configurada.

**Exemplos do mix na mesma entidade:**

| Entidade | Coluna camelCase | Coluna snake_case (explícito) |
|----------|-----------------|------------------------------|
| Pipeline | `organizationId` | `component_id` |
| PipelineRun | `pipelineId` | `organization_id`, `deployment_id` |
| Deployment | `componentId`, `environmentId` | `pipeline_run_id` |
| Component | 10 colunas sem `name:` | 4 com `name:` explícito |

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S62.04 | Add SnakeNamingStrategy to TypeORM config | Configurar `namingStrategy: new SnakeNamingStrategy()` no `forRootAsync()` e `typeorm-cli.config.ts` |
| FARM-S62.05 | Generate migration to rename ~330 columns to snake_case | Migration que renomeia colunas camelCase → snake_case, com auditoria de FKs, índices, unique constraints |
| FARM-S62.06 | Remove redundant explicit `name:` from 56 columns | Colunas cujo `name:` explícito coincide com o que SnakeNamingStrategy geraria — remover para simplificar |
| FARM-S62.07 | Add lint/test to forbid camelCase columns with SnakeNamingStrategy | Garantir que futuras entidades mantenham consistência |

---

## Phase 63: Security & Validation Hardening

### Epic FARM-E63.1 — ValidationPipe Strict Mode

**Gap:** `enableImplicitConversion: true` no `ValidationPipe` global. 12 DTOs que herdam de `PaginationQueryDto` dependem dessa conversão implícita. 7 DTOs têm `@Type(() => Number)` ou `@Transform` redundantes (a conversão implícita já faz o trabalho).

**DTOs que dependem de implicit conversion:**

| DTO base | Filhos afetados |
|----------|----------------|
| `PaginationQueryDto` (skip, take como `@IsInt()`) | 12 DTOs em: teams, environment-request, environments, pipelines, alerting, documentation, incident, service-template, slo, dashboard, catalog, organization |

**DTOs com decorators redundantes a remover:**
- `CloudCostDto.days` — `@Type(() => Number)`
- `ListRunsQueryDto.skip/take` — `@Type(() => Number)`
- `AdvancedSearchQueryDto.page/limit` — `@Type(() => Number)`
- `ListViolationsDto.skip/take` — `@Transform(({ value }) => Number(value))`
- 3 boolean `@Transform` em `ListViolationsDto`, `ListSlosQueryDto`, `ListAlertingRulesQueryDto`
- 2 array `@Transform` em `AdvancedSearchQueryDto` — **manter** (não redundantes)

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S63.01 | Add @Type(() => Number) to PaginationQueryDto.skip and take | Adicionar decorator na classe base — corrige os 12 filhos automaticamente |
| FARM-S63.02 | Remove 10 redundant @Type/@Transform decorators | Remover decorators desnecessários de 7 DTOs |
| FARM-S63.03 | Remove enableImplicitConversion from ValidationPipe | Alterar `main.ts:105` para remover `enableImplicitConversion: true` |
| FARM-S63.04 | Add validation tests for query param types | Testes de integração que validam rejeição de tipos errados em query params |

---

### Epic FARM-E63.2 — Global JwtAuthGuard + @Public()

**Gap:** `JwtAuthGuard` aplicado manualmente por controller (~50 controllers). Sem mecanismo `@Public()` padronizado — rotas desprotegidas simplesmente omitem o guard. Se uma rota nova "esquece" o guard, fica desprotegida.

**Endpoints que precisam de `@Public()` (26 endpoints, 8 controllers):**

| Controller | Endpoints | Mecanismo atual |
|-----------|----------|-----------------|
| HealthController | 1 (`GET /health`) | Sem guard |
| AppController | 1 (`GET /`) | Sem guard |
| TracesIngestController | 1 (`POST /traces/ingest`) | Sem guard (browser OTel) |
| WebhookReceiverController | 7 (`POST /webhooks/*`) | HMAC secret |
| DocsWebhookController | 1 (`POST /docs/webhook`) | HMAC |
| AuthController | 10 (login, refresh, 4 OAuth, LDAP, providers) | Guards específicos (passport) |
| IacController | 3 (ingest, import, module-drift) | Token estático |
| InvitationController | 2 (preview, accept by token) | Token de convite |

**Controllers com `@UseGuards(JwtAuthGuard)` no nível da classe (~50):** Precisam ter `JwtAuthGuard` removido da cadeia (já será global), mantendo `OrgRequiredGuard`, `PermissionGuard`, `RolesGuard`.

**Atenção especial:** `AuthController` tem OAuth routes com guards específicos (ex: `AuthGuard("github")`). Se `JwtAuthGuard` rodar globalmente, bloquearia essas rotas antes do guard específico executar. `@Public()` deve permitir passar para o guard específico.

**Stories:**

| ID | Story | Descrição |
|----|-------|-----------|
| FARM-S63.05 | Create @Public() decorator and IS_PUBLIC_KEY constant | Novo arquivo `common/decorators/public.decorator.ts` |
| FARM-S63.06 | Update JwtAuthGuard.canActivate() to honor @Public() | Adicionar `Reflector` injection e check de metadata `IS_PUBLIC_KEY` |
| FARM-S63.07 | Register JwtAuthGuard as APP_GUARD | Adicionar provider global em `app.module.ts` |
| FARM-S63.08 | Add @Public() to 26 unprotected endpoints across 8 controllers | Health, traces, webhooks, auth, IaC, invitation |
| FARM-S63.09 | Remove JwtAuthGuard from ~50 controller @UseGuards chains | Manter OrgRequiredGuard, PermissionGuard, RolesGuard onde aplicável |
| FARM-S63.10 | Update ~35 test files that overrideGuard(JwtAuthGuard) | Adaptar para guard global ou usar mock de @Public() |
| FARM-S63.11 | Update AGENTS.md with @Public() convention | Documentar novo pattern de rotas públicas |

---

## Risk Matrix

| Phase | Risco | Maior perigo |
|-------|-------|-------------|
| 60: Dev Experience & Build | Baixo | ESM migration pode quebrar builds se `passport-ldapauth` não suportar `createRequire` |
| 61: NestJS Code Quality | Baixo-Médio | Extrair composite modules pode causar dependências circulares |
| 62: API Docs & DB Hygiene | Alto | Migration de colunas em produção com 51 entidades — testar com volume real de dados |
| 63: Security & Validation | Alto | Remover `JwtAuthGuard` de 50 controllers — rotina esquecida fica sem proteção |

---

## Rollback Strategy

- **Fase 60:** Reverter ESLint config e tsconfig — sem impacto em runtime
- **Fase 61:** Reverter imports no AppModule — semântica equivalente
- **Fase 62:** DB migration é reversível (rename columns back) se aplicada isoladamente; Snapshot DB antes
- **Fase 63:** Manter `enableImplicitConversion` como flag de config permite rollback via env var; `@Public()` é aditivo — não quebra rotas existentes se aplicado corretamente

---

## Verification

Cada fase deve ser verificada com:
- `npm run lint --workspace=apps/api` (sem novos warnings)
- `npm run test --workspace=apps/api` (todos os testes passam)
- `npm run test:e2e --workspace=apps/api` (e2e passam)
- `make check` (full pipeline verde)
- Swagger UI manual verification (fases 62 e 63)
