import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable pipeline_run_id column to the deployments table.
 * Allows tracing which pipeline run auto-created a given deployment.
 */
export class AddDeploymentPipelineRunId1776500000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deployments" ADD COLUMN IF NOT EXISTS "pipeline_run_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_deployment_pipeline_run_id" ON "deployments" ("pipeline_run_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_deployment_pipeline_run_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" DROP COLUMN IF EXISTS "pipeline_run_id"`,
    );
  }
}
