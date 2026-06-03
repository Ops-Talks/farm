import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the slos table for Service Level Objectives
 * (FARM-E51 - SLO tracking and error budget management).
 */
export class AddSlos1774200000001 implements MigrationInterface {
  name = "AddSlos1774200000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "slos" (
        "id"              uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"            varchar(100)      NOT NULL,
        "description"     varchar,
        "targetPercent"   decimal(5,2)      NOT NULL,
        "metricType"      varchar(20)       NOT NULL,
        "window"          varchar(10)       NOT NULL,
        "componentId"     uuid,
        "organizationId"  uuid,
        "enabled"         boolean           NOT NULL DEFAULT true,
        "createdAt"       timestamptz       NOT NULL DEFAULT now(),
        "updatedAt"       timestamptz       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_slos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_slos_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_slos_component_id"
        ON "slos" ("componentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_slos_organization_id"
        ON "slos" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_slos_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_slos_component_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slos"`);
  }
}
