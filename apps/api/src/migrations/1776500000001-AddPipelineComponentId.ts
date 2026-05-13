import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable component_id foreign-key column to the pipelines table.
 */
export class AddPipelineComponentId1776500000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipelines" ADD COLUMN IF NOT EXISTS "component_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pipeline_component_id" ON "pipelines" ("component_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" ADD CONSTRAINT "FK_pipelines_component_id" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE SET NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipelines" DROP CONSTRAINT IF EXISTS "FK_pipelines_component_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pipeline_component_id"`);
    await queryRunner.query(
      `ALTER TABLE "pipelines" DROP COLUMN IF EXISTS "component_id"`,
    );
  }
}
