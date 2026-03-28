import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the gateway_routes and api_health_checks tables for the
 * API gateway integration feature.
 */
export class AddGateway1773950000001 implements MigrationInterface {
  name = "AddGateway1773950000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "gateway_routes" (
          "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
          "externalId"  varchar     NOT NULL,
          "name"        varchar     NOT NULL,
          "paths"       text        NOT NULL DEFAULT '',
          "methods"     text        NOT NULL DEFAULT '',
          "tags"        text,
          "gatewayType" varchar     NOT NULL,
          "componentId" uuid,
          "syncedAt"    timestamptz,
          "createdAt"   timestamptz NOT NULL DEFAULT now(),
          "updatedAt"   timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_gateway_routes" PRIMARY KEY ("id"),
          CONSTRAINT "FK_gateway_routes_component"
            FOREIGN KEY ("componentId") REFERENCES "components" ("id")
            ON DELETE SET NULL
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_gateway_routes_gatewayType" ON "gateway_routes" ("gatewayType")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_gateway_routes_componentId" ON "gateway_routes" ("componentId")`,
      );

      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_gateway_routes_externalId_type"
          ON "gateway_routes" ("externalId", "gatewayType")`,
      );

      await queryRunner.query(`
        CREATE TABLE "api_health_checks" (
          "id"        uuid        NOT NULL DEFAULT uuid_generate_v4(),
          "url"       varchar     NOT NULL,
          "status"    varchar     NOT NULL DEFAULT 'up',
          "latencyMs" int,
          "apiSpecId" uuid,
          "checkedAt" timestamptz NOT NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_api_health_checks" PRIMARY KEY ("id"),
          CONSTRAINT "FK_api_health_checks_apiSpec"
            FOREIGN KEY ("apiSpecId") REFERENCES "api_specs" ("id")
            ON DELETE SET NULL
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_api_health_checks_url" ON "api_health_checks" ("url")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_api_health_checks_apiSpecId" ON "api_health_checks" ("apiSpecId")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_api_health_checks_checkedAt" ON "api_health_checks" ("checkedAt")`,
      );
    } else {
      // SQLite (used in E2E tests with better-sqlite3)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "gateway_routes" (
          "id"          varchar NOT NULL,
          "externalId"  varchar NOT NULL,
          "name"        varchar NOT NULL,
          "paths"       text    NOT NULL DEFAULT '',
          "methods"     text    NOT NULL DEFAULT '',
          "tags"        text,
          "gatewayType" varchar NOT NULL,
          "componentId" varchar,
          "syncedAt"    datetime,
          "createdAt"   datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt"   datetime NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "api_health_checks" (
          "id"        varchar  NOT NULL,
          "url"       varchar  NOT NULL,
          "status"    varchar  NOT NULL DEFAULT 'up',
          "latencyMs" integer,
          "apiSpecId" varchar,
          "checkedAt" datetime NOT NULL,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_api_health_checks_checkedAt"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_api_health_checks_apiSpecId"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_api_health_checks_url"`,
      );
      await queryRunner.query(`DROP TABLE IF EXISTS "api_health_checks"`);

      await queryRunner.query(
        `DROP INDEX IF EXISTS "UQ_gateway_routes_externalId_type"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_gateway_routes_componentId"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_gateway_routes_gatewayType"`,
      );
      await queryRunner.query(`DROP TABLE IF EXISTS "gateway_routes"`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS "api_health_checks"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "gateway_routes"`);
    }
  }
}
