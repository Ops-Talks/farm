import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable organization_id column to actual_costs and cost_estimates tables.
 * Enables per-tenant FinOps cost isolation.
 */
export class AddFinOpsOrgId1776600000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "actual_costs" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_actual_costs_organization_id"
       ON "actual_costs" ("organization_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cost_estimates_organization_id"
       ON "cost_estimates" ("organization_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_cost_estimates_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cost_estimates" DROP COLUMN IF EXISTS "organization_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_actual_costs_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "actual_costs" DROP COLUMN IF EXISTS "organization_id"`,
    );
  }
}
