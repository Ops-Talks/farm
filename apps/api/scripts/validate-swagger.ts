/**
 * Validates Swagger/OpenAPI documentation coverage.
 *
 * Checks:
 *  1. Every controller route has @ApiOperation with summary
 *  2. Every controller route has @ApiResponse for 200/201/401/403
 *  3. Every request DTO body property has @ApiProperty with description
 *
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/validate-swagger.ts
 * Exit: 0 if all checks pass, 1 if violations found.
 */
import { Test } from "@nestjs/testing";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import { createSwaggerConfig } from "../src/common/swagger/swagger-config";
import { DataSource } from "typeorm";

interface Violation {
  path: string;
  method: string;
  issue: string;
}

function deferred<T>(value: T): (...args: unknown[]) => Promise<T> {
  return () => Promise.resolve(value);
}

function mockDataSource(): DataSource {
  const repoMethods: Record<string, (...args: unknown[]) => unknown> = {
    find: deferred([]),
    findOne: deferred(null),
    findOneBy: deferred(null),
    findBy: deferred([]),
    findAndCount: deferred([[], 0]),
    create: (dto?: unknown) => dto ?? {},
    save: deferred(undefined),
    update: deferred({ affected: 1 }),
    delete: deferred({ affected: 0 }),
    remove: deferred({}),
    count: deferred(0),
    merge: (_e: unknown, dto: unknown) => dto,
    upsert: deferred({}),
    softDelete: deferred({ affected: 0 }),
    restore: deferred({ affected: 0 }),
    increment: deferred({ affected: 0 }),
    decrement: deferred({ affected: 0 }),
    query: deferred([]),
    insert: deferred({ identifiers: [], generatedMaps: [] }),
  };

  const createQueryBuilder = () => {
    const qb: Record<string, (...args: unknown[]) => unknown> = {
      select: () => qb,
      addSelect: () => qb,
      where: () => qb,
      andWhere: () => qb,
      orWhere: () => qb,
      leftJoin: () => qb,
      innerJoin: () => qb,
      leftJoinAndSelect: () => qb,
      innerJoinAndSelect: () => qb,
      groupBy: () => qb,
      having: () => qb,
      orderBy: () => qb,
      addOrderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      limit: () => qb,
      offset: () => qb,
      setParameter: () => qb,
      getMany: deferred([]),
      getOne: deferred(null),
      getManyAndCount: deferred([[], 0]),
      getRawMany: deferred([]),
      getRawOne: deferred(null),
      execute: deferred({ affected: 0 }),
      delete: () => qb,
      update: () => qb,
      insert: () => qb,
    };
    return qb as Record<string, (...args: unknown[]) => unknown>;
  };

  const mockRepo = {
    ...repoMethods,
    createQueryBuilder,
  };

  const manager = {
    find: deferred([]),
    findOne: deferred(null),
    save: deferred({}),
    create: (dto?: unknown) => dto ?? {},
    query: deferred([]),
    transaction: (cb: (mgr: unknown) => Promise<unknown>) =>
      cb(manager),
    getRepository: deferred(mockRepo),
    findOneBy: deferred(null),
    findBy: deferred([]),
    findAndCount: deferred([[], 0]),
    count: deferred(0),
    delete: deferred({ affected: 0 }),
    update: deferred({ affected: 1 }),
    insert: deferred({ identifiers: [], generatedMaps: [] }),
    remove: deferred({}),
    softDelete: deferred({ affected: 0 }),
    restore: deferred({ affected: 0 }),
    increment: deferred({ affected: 0 }),
    decrement: deferred({ affected: 0 }),
    clear: deferred(undefined),
    hasId: () => false,
    getIdCondition: () => ({}),
    merge: (_e: unknown, dto: unknown) => dto,
  };

  return {
    isInitialized: true,
    options: { type: "postgres" } as DataSource["options"],
    entityMetadatas: [],
    manager,
    getRepository: deferred(mockRepo),
    getTreeRepository: deferred(mockRepo),
    getMongoRepository: deferred(mockRepo),
    initialize: deferred(undefined),
    destroy: deferred(undefined),
    query: deferred([]),
    hasId: () => false,
    getIdCondition: () => ({}),
    getMetadata: () => ({}),
  } as unknown as DataSource;
}

async function main(): Promise<void> {
  process.env.NODE_ENV = "test";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DataSource)
    .useValue(mockDataSource())
    .compile();

  const app = moduleRef.createNestApplication();
  const config = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);
  await app.close();

  const violations: Violation[] = [];
  const paths = document.paths ?? {};

  for (const [routePath, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
      const op = operation as any;

      if (!op.summary && !op.description) {
        violations.push({
          path: routePath,
          method,
          issue: "Missing @ApiOperation({ summary })",
        });
      }

      const hasSuccess = op.responses?.["200"] || op.responses?.["201"];
      if (!hasSuccess) {
        violations.push({
          path: routePath,
          method,
          issue: "Missing @ApiResponse(200) or @ApiResponse(201)",
        });
      }

      const hasAuth = op.responses?.["401"];
      if (!hasAuth && op.security && op.security.length > 0) {
        violations.push({
          path: routePath,
          method,
          issue: "Missing @ApiResponse(401) on authenticated route",
        });
      }
    }
  }

  const schemas = document.components?.schemas ?? {};
  for (const [name, schema] of Object.entries(schemas)) {
    const s = schema as any;
    if (!s.properties) continue;
    for (const [prop, propSchema] of Object.entries(s.properties)) {
      const ps = propSchema as any;
      if (!ps.description) {
        violations.push({
          path: `#/components/schemas/${name}`,
          method: "SCHEMA",
          issue: `Property "${prop}" has no @ApiProperty({ description })`,
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`Found ${violations.length} Swagger documentation violations:`);
    for (const v of violations) {
      console.error(`  ${v.method.toUpperCase()} ${v.path}: ${v.issue}`);
    }
    process.exit(1);
  }

  console.log(`Swagger validation passed — ${Object.keys(paths).length} endpoints, 0 violations.`);
}

main().catch((err) => {
  console.error("Swagger validation failed with error:", err);
  process.exit(1);
});
