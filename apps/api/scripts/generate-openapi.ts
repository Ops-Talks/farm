import { Test } from "@nestjs/testing";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import { createSwaggerConfig } from "../src/common/swagger/swagger-config";
import { DataSource } from "typeorm";
import * as fs from "fs";
import * as path from "path";

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

async function generate(): Promise<void> {
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

  const outputPath = path.join(__dirname, "..", "openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf-8");
  console.error(`openapi.json written to ${outputPath}`);

  await app.close();
}

void generate().catch((err: unknown) => {
  console.error("Failed to generate openapi.json", err);
  process.exit(1);
});
