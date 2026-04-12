import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the opa_results table for storing OPA policy evaluation results.
 * Skipped for non-Postgres databases (SQLite uses synchronize=true in dev/test).
 */
export class CreateOpaResultTable1744000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "opa_results" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "componentId" varchar NOT NULL,
          "policyPath" varchar NOT NULL,
          "allowed" boolean NOT NULL,
          "violations" text,
          "evaluatedAt" timestamp NOT NULL DEFAULT now(),
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_opa_results" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_opa_results_componentId" ON "opa_results" ("componentId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(`DROP TABLE IF EXISTS "opa_results"`);
    }
  }
}
