import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the environment_requests table for self-service
 * environment provisioning (FARM-E58 - Self-Service Environment Provisioning).
 */
export class AddEnvironmentRequests1774300000002 implements MigrationInterface {
  name = "AddEnvironmentRequests1774300000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "environment_requests" (
          "id"              uuid              NOT NULL DEFAULT uuid_generate_v4(),
          "name"            varchar(100)      NOT NULL,
          "description"     varchar,
          "requestedBy"     uuid              NOT NULL,
          "type"            varchar(20)       NOT NULL,
          "tier"            varchar(10)       NOT NULL,
          "ttlHours"        integer           NOT NULL DEFAULT 24,
          "status"          varchar(20)       NOT NULL DEFAULT 'pending',
          "statusMessage"   varchar,
          "reviewedBy"      uuid,
          "reviewedAt"      timestamptz,
          "provisionedAt"   timestamptz,
          "expiresAt"       timestamptz,
          "componentId"     uuid,
          "environmentId"   uuid,
          "organizationId"  uuid,
          "createdAt"       timestamptz       NOT NULL DEFAULT now(),
          "updatedAt"       timestamptz       NOT NULL DEFAULT now(),
          CONSTRAINT "PK_environment_requests" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_environment_requests_component_id"
          ON "environment_requests" ("componentId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_environment_requests_organization_id"
          ON "environment_requests" ("organizationId")
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE "environment_requests" (
          "id"              varchar           NOT NULL,
          "name"            varchar(100)      NOT NULL,
          "description"     varchar,
          "requestedBy"     varchar           NOT NULL,
          "type"            varchar(20)       NOT NULL,
          "tier"            varchar(10)       NOT NULL,
          "ttlHours"        integer           NOT NULL DEFAULT 24,
          "status"          varchar(20)       NOT NULL DEFAULT 'pending',
          "statusMessage"   varchar,
          "reviewedBy"      varchar,
          "reviewedAt"      datetime,
          "provisionedAt"   datetime,
          "expiresAt"       datetime,
          "componentId"     varchar,
          "environmentId"   varchar,
          "organizationId"  varchar,
          "createdAt"       datetime          NOT NULL DEFAULT (datetime('now')),
          "updatedAt"       datetime          NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_environment_requests_component_id"
          ON "environment_requests" ("componentId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_environment_requests_organization_id"
          ON "environment_requests" ("organizationId")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_environment_requests_organization_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_environment_requests_component_id"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "environment_requests"`);
  }
}
