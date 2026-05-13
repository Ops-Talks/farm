import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable deployment_id column to the pipeline_runs table.
 */
export class AddPipelineRunDeploymentId1776500000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" ADD COLUMN IF NOT EXISTS "deployment_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pipeline_run_deployment_id" ON "pipeline_runs" ("deployment_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pipeline_run_deployment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" DROP COLUMN IF EXISTS "deployment_id"`,
    );
  }
}
