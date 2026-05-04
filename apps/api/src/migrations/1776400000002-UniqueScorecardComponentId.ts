import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * FARM-S390 follow-up — enforces a unique constraint on scorecard_results.component_id.
 *
 * A component must have at most one scorecard result row. The unique index
 * enables TypeORM upsert (INSERT … ON CONFLICT DO UPDATE) which eliminates
 * the read-then-insert race condition that could previously produce duplicate
 * rows when a manual refresh raced against the hourly cron job.
 */
export class UniqueScorecardComponentId1776400000002
  implements MigrationInterface
{
  name = "UniqueScorecardComponentId1776400000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    // Drop the old non-unique index first; it will be replaced by the unique one.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_scorecard_results_component_id"`,
    );

    if (isPostgres) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_scorecard_results_component_id"
          ON "scorecard_results" ("component_id")
      `);
    } else {
      // SQLite — DROP INDEX syntax does not require the table name qualifier.
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_scorecard_results_component_id"
          ON "scorecard_results" ("component_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_scorecard_results_component_id"`,
    );

    // Restore the original non-unique index.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scorecard_results_component_id"
        ON "scorecard_results" ("component_id")
    `);
  }
}
