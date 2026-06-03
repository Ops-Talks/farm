import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the metadata JSONB column to the pipeline_runs table.
 *
 */
export class AddPipelineRunMetadata1774900000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" ADD COLUMN IF NOT EXISTS "metadata" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" DROP COLUMN IF EXISTS "metadata"`,
    );
  }
}
