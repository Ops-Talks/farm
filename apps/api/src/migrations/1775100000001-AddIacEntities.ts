import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddIacEntities
 * Creates iac_stacks, iac_runs, and iac_module_drifts tables for the
 * Cultivator + Agronomist integration (FARM-E70).
 */
export class AddIacEntities1775100000001 implements MigrationInterface {
  name = "AddIacEntities1775100000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "iac_stacks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "environment" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "repositoryUrl" character varying,
        "basePath" character varying,
        "externalToolUrl" character varying,
        "componentId" character varying,
        "autoImported" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_iac_stacks_name_environment" UNIQUE ("name", "environment"),
        CONSTRAINT "PK_iac_stacks" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_stacks_environment" ON "iac_stacks" ("environment")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iac_stacks_componentId" ON "iac_stacks" ("componentId")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."iac_runs_type_enum" AS ENUM('plan', 'apply')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."iac_runs_status_enum" AS ENUM('succeeded', 'failed', 'cancelled')`,
    );

    await queryRunner.query(
      `CREATE TABLE "iac_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stackId" uuid NOT NULL,
        "type" "public"."iac_runs_type_enum" NOT NULL,
        "status" "public"."iac_runs_status_enum" NOT NULL,
        "environment" character varying NOT NULL,
        "provider" character varying,
        "resourceChanges" text,
        "triggeredBy" character varying,
        "pipelineUrl" character varying,
        "startedAt" TIMESTAMP,
        "finishedAt" TIMESTAMP,
        "durationMs" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_iac_runs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_iac_runs_stackId" FOREIGN KEY ("stackId")
          REFERENCES "iac_stacks" ("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_runs_stackId" ON "iac_runs" ("stackId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iac_runs_environment" ON "iac_runs" ("environment")`,
    );

    await queryRunner.query(
      `CREATE TABLE "iac_module_drifts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stackPath" character varying NOT NULL,
        "moduleName" character varying NOT NULL,
        "sourceUrl" character varying NOT NULL,
        "currentRef" character varying NOT NULL,
        "latestRef" character varying NOT NULL,
        "versionsBehind" integer NOT NULL,
        "detectedAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_iac_module_drifts" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_module_drifts_moduleName" ON "iac_module_drifts" ("moduleName")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iac_module_drifts_detectedAt" ON "iac_module_drifts" ("detectedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_module_drifts_detectedAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_module_drifts_moduleName"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "iac_module_drifts"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_iac_runs_environment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_iac_runs_stackId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "iac_runs"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."iac_runs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."iac_runs_type_enum"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_stacks_componentId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_stacks_environment"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "iac_stacks"`);
  }
}
