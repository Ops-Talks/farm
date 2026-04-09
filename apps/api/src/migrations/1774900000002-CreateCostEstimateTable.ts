import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the cost_estimates table for infracost pipeline integration.
 * Skipped for non-Postgres databases (SQLite uses synchronize=true in dev/test).
 */
export class CreateCostEstimateTable1774900000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "cost_estimates" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "componentId" uuid NOT NULL,
          "pipelineRunId" uuid,
          "estimatedMonthlyCost" numeric(12,4) NOT NULL DEFAULT 0,
          "currency" varchar NOT NULL DEFAULT 'USD',
          "diffMonthlyCost" numeric(12,4) NOT NULL DEFAULT 0,
          "breakdown" text,
          "measuredAt" timestamp NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_cost_estimates" PRIMARY KEY ("id"),
          CONSTRAINT "FK_cost_estimates_component"
            FOREIGN KEY ("componentId")
            REFERENCES "components"("id")
            ON DELETE CASCADE
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_cost_estimates_componentId" ON "cost_estimates" ("componentId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(`DROP TABLE IF EXISTS "cost_estimates"`);
    }
  }
}
