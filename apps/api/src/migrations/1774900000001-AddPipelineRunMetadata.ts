import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the metadata JSONB column to the pipeline_runs table.
 * Skipped for non-Postgres databases (SQLite uses synchronize=true in dev/test).
 */
export class AddPipelineRunMetadata1774900000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(
        `ALTER TABLE "pipeline_runs" ADD COLUMN IF NOT EXISTS "metadata" text`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(
        `ALTER TABLE "pipeline_runs" DROP COLUMN IF EXISTS "metadata"`,
      );
    }
  }
}
