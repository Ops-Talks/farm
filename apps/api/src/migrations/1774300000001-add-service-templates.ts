import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates tables for service templates and scaffold requests
 * (FARM-E57 - Service Templates and Golden Paths).
 */
export class AddServiceTemplates1774300000001 implements MigrationInterface {
  name = "AddServiceTemplates1774300000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "service_templates" (
          "id"              uuid              NOT NULL DEFAULT uuid_generate_v4(),
          "name"            varchar(100)      NOT NULL,
          "description"     varchar,
          "language"        varchar(50)       NOT NULL,
          "framework"       varchar(50)       NOT NULL,
          "tags"            text,
          "repositoryUrl"   varchar           NOT NULL,
          "variables"       jsonb,
          "isBuiltIn"       boolean           NOT NULL DEFAULT true,
          "organizationId"  uuid,
          "createdAt"       timestamptz       NOT NULL DEFAULT now(),
          "updatedAt"       timestamptz       NOT NULL DEFAULT now(),
          CONSTRAINT "PK_service_templates" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_service_templates_name" UNIQUE ("name")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_service_templates_organization_id"
          ON "service_templates" ("organizationId")
      `);

      await queryRunner.query(`
        CREATE TABLE "scaffold_requests" (
          "id"                uuid              NOT NULL DEFAULT uuid_generate_v4(),
          "templateId"        uuid              NOT NULL,
          "templateName"      varchar(100)      NOT NULL,
          "targetRepository"  varchar(200)      NOT NULL,
          "variables"         jsonb,
          "status"            varchar(20)       NOT NULL DEFAULT 'pending',
          "statusMessage"     varchar,
          "requestedBy"       uuid              NOT NULL,
          "dryRun"            boolean           NOT NULL DEFAULT false,
          "renderedFiles"     jsonb,
          "organizationId"    uuid,
          "createdAt"         timestamptz       NOT NULL DEFAULT now(),
          "updatedAt"         timestamptz       NOT NULL DEFAULT now(),
          CONSTRAINT "PK_scaffold_requests" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_scaffold_requests_template_id"
          ON "scaffold_requests" ("templateId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_scaffold_requests_organization_id"
          ON "scaffold_requests" ("organizationId")
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE "service_templates" (
          "id"              varchar           NOT NULL,
          "name"            varchar(100)      NOT NULL UNIQUE,
          "description"     varchar,
          "language"        varchar(50)       NOT NULL,
          "framework"       varchar(50)       NOT NULL,
          "tags"            text,
          "repositoryUrl"   varchar           NOT NULL,
          "variables"       text,
          "isBuiltIn"       boolean           NOT NULL DEFAULT (1),
          "organizationId"  varchar,
          "createdAt"       datetime          NOT NULL DEFAULT (datetime('now')),
          "updatedAt"       datetime          NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_service_templates_organization_id"
          ON "service_templates" ("organizationId")
      `);

      await queryRunner.query(`
        CREATE TABLE "scaffold_requests" (
          "id"                varchar           NOT NULL,
          "templateId"        varchar           NOT NULL,
          "templateName"      varchar(100)      NOT NULL,
          "targetRepository"  varchar(200)      NOT NULL,
          "variables"         text,
          "status"            varchar(20)       NOT NULL DEFAULT 'pending',
          "statusMessage"     varchar,
          "requestedBy"       varchar           NOT NULL,
          "dryRun"            boolean           NOT NULL DEFAULT (0),
          "renderedFiles"     text,
          "organizationId"    varchar,
          "createdAt"         datetime          NOT NULL DEFAULT (datetime('now')),
          "updatedAt"         datetime          NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_scaffold_requests_template_id"
          ON "scaffold_requests" ("templateId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_scaffold_requests_organization_id"
          ON "scaffold_requests" ("organizationId")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_scaffold_requests_organization_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_scaffold_requests_template_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_service_templates_organization_id"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "scaffold_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_templates"`);
  }
}
