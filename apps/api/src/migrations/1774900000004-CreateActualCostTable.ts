import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the actual_costs table for OpenCost sync data.
 * Skipped for non-Postgres databases (SQLite uses synchronize=true in dev/test).
 */
export class CreateActualCostTable1774900000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "actual_costs" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "componentId" uuid NOT NULL,
          "window" varchar NOT NULL DEFAULT '30d',
          "cpuCost" numeric(12,4) NOT NULL DEFAULT 0,
          "memoryCost" numeric(12,4) NOT NULL DEFAULT 0,
          "pvCost" numeric(12,4) NOT NULL DEFAULT 0,
          "networkCost" numeric(12,4) NOT NULL DEFAULT 0,
          "totalCost" numeric(12,4) NOT NULL DEFAULT 0,
          "currency" varchar NOT NULL DEFAULT 'USD',
          "syncedAt" timestamp NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_actual_costs" PRIMARY KEY ("id"),
          CONSTRAINT "FK_actual_costs_component"
            FOREIGN KEY ("componentId")
            REFERENCES "components"("id")
            ON DELETE CASCADE
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_actual_costs_componentId" ON "actual_costs" ("componentId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    if (dbType === "postgres") {
      await queryRunner.query(`DROP TABLE IF EXISTS "actual_costs"`);
    }
  }
}
