import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable organization_id column to the pipeline_runs table.
 * Backfills from the parent pipeline's organization_id so existing run
 * records are already org-scoped after the migration.
 */
export class AddPipelineRunOrgId1776600000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );
    await queryRunner.query(
      `UPDATE "pipeline_runs" pr
       SET "organization_id" = p."organizationId"::uuid
       FROM "pipelines" p
       WHERE pr."pipelineId" = p."id"
         AND pr."organization_id" IS NULL
         AND p."organizationId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pipeline_runs_organization_id"
       ON "pipeline_runs" ("organization_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pipeline_runs_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" DROP COLUMN IF EXISTS "organization_id"`,
    );
  }
}
