import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * FARM-S390 — creates the scorecard_results table.
 *
 * Stores the outcome of every scorecard evaluation run against a catalog
 * component: overall score, maturity level, per-category scores, and the
 * full list of criterion results.
 *
 * The table supports both PostgreSQL (production) and SQLite (test/dev).
 */
export class AddScorecardResults1776400000001 implements MigrationInterface {
  name = "AddScorecardResults1776400000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "scorecard_results" (
          "id"              uuid            NOT NULL DEFAULT gen_random_uuid(),
          "component_id"    uuid            NOT NULL,
          "overall_score"   decimal(5,2)    NOT NULL DEFAULT 0,
          "level"           varchar         NOT NULL DEFAULT 'none',
          "category_scores" text,
          "criteria"        text,
          "organization_id" varchar,
          "evaluated_at"    timestamp,
          "created_at"      timestamp       NOT NULL DEFAULT now(),
          "updated_at"      timestamp       NOT NULL DEFAULT now(),
          CONSTRAINT "PK_scorecard_results" PRIMARY KEY ("id"),
          CONSTRAINT "FK_scorecard_results_component"
            FOREIGN KEY ("component_id")
            REFERENCES "components"("id")
            ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_scorecard_results_component_id"
          ON "scorecard_results" ("component_id")
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_scorecard_results_organization_id"
          ON "scorecard_results" ("organization_id")
      `);
    } else {
      // SQLite — used in unit and E2E tests via better-sqlite3.
      // UUIDs become varchar; decimal becomes text; timestamp becomes datetime.
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "scorecard_results" (
          "id"              varchar         NOT NULL,
          "component_id"    varchar         NOT NULL,
          "overall_score"   text            NOT NULL DEFAULT '0',
          "level"           varchar         NOT NULL DEFAULT 'none',
          "category_scores" text,
          "criteria"        text,
          "organization_id" varchar,
          "evaluated_at"    datetime,
          "created_at"      datetime        NOT NULL DEFAULT (datetime('now')),
          "updated_at"      datetime        NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_scorecard_results_component_id"
          ON "scorecard_results" ("component_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_scorecard_results_organization_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_scorecard_results_component_id"`,
      );
    } else {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_scorecard_results_component_id"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "scorecard_results"`);
  }
}
