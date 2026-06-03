import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the costBudgetUsd column to the components table.
 *
 */
export class AddCostBudgetUsdToComponent1774900000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "components" ADD COLUMN IF NOT EXISTS "costBudgetUsd" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "components" DROP COLUMN IF EXISTS "costBudgetUsd"`,
    );
  }
}
