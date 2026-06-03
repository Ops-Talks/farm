import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the api_specs and api_consumers tables for the API
 * catalog and lifecycle management feature.
 */
export class AddApiSpecs1773940000001 implements MigrationInterface {
  name = "AddApiSpecs1773940000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "api_specs" (
        "id"            uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "componentId"   uuid          NOT NULL,
        "name"          varchar       NOT NULL,
        "format"        varchar       NOT NULL DEFAULT 'openapi',
        "version"       varchar       NOT NULL,
        "spec"          text          NOT NULL,
        "status"        varchar       NOT NULL DEFAULT 'active',
        "deprecatedAt"  timestamptz,
        "sunsetAt"      timestamptz,
        "createdAt"     timestamptz   NOT NULL DEFAULT now(),
        "updatedAt"     timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_specs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_specs_component"
          FOREIGN KEY ("componentId") REFERENCES "components" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_api_specs_componentId" ON "api_specs" ("componentId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "api_consumers" (
        "id"                    uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "apiSpecId"             uuid        NOT NULL,
        "consumerComponentId"   uuid,
        "consumerTeamId"        uuid,
        "addedAt"               timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_api_consumers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_consumers_apiSpec"
          FOREIGN KEY ("apiSpecId") REFERENCES "api_specs" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_api_consumers_consumerComponent"
          FOREIGN KEY ("consumerComponentId") REFERENCES "components" ("id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_api_consumers_apiSpecId" ON "api_consumers" ("apiSpecId")`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_api_consumers_spec_component"
        ON "api_consumers" ("apiSpecId", "consumerComponentId")
        WHERE "consumerComponentId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_api_consumers_spec_component"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_api_consumers_apiSpecId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "api_consumers"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_api_specs_componentId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_specs"`);
  }
}
