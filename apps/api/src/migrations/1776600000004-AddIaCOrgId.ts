import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable organization_id column to all IaC tables:
 *   iac_stacks, iac_runs, iac_modules, iac_resources,
 *   iac_module_drifts, iac_module_versions, iac_resource_dependencies.
 *
 * Also updates the IacStack unique constraint from (name, environment) to
 * (name, environment, organization_id) to allow same-named stacks per tenant.
 */
export class AddIaCOrgId1776600000004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const tables: { table: string; index: string }[] = [
      { table: "iac_stacks", index: "IDX_iac_stacks_organization_id" },
      { table: "iac_runs", index: "IDX_iac_runs_organization_id" },
      { table: "iac_modules", index: "IDX_iac_modules_organization_id" },
      { table: "iac_resources", index: "IDX_iac_resources_organization_id" },
      {
        table: "iac_module_drifts",
        index: "IDX_iac_module_drifts_organization_id",
      },
      {
        table: "iac_module_versions",
        index: "IDX_iac_module_versions_organization_id",
      },
      {
        table: "iac_resource_dependencies",
        index: "IDX_iac_resource_dependencies_organization_id",
      },
    ];

    for (const { table, index } of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${index}" ON "${table}" ("organization_id")`,
      );
    }

    // Widen IacStack uniqueness to include organization_id so different
    // tenants can have stacks with the same name+environment.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ba6b6f41c21dfad6bb4bdbbf83c"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_iac_stacks_name_env_org"
       ON "iac_stacks" ("name", "environment", "organization_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_stacks_name_env_org"`,
    );
    // Restore the original (name, environment) unique constraint.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ba6b6f41c21dfad6bb4bdbbf83c"
       ON "iac_stacks" ("name", "environment")`,
    );

    const tables = [
      {
        table: "iac_resource_dependencies",
        index: "IDX_iac_resource_dependencies_organization_id",
      },
      {
        table: "iac_module_versions",
        index: "IDX_iac_module_versions_organization_id",
      },
      {
        table: "iac_module_drifts",
        index: "IDX_iac_module_drifts_organization_id",
      },
      { table: "iac_resources", index: "IDX_iac_resources_organization_id" },
      { table: "iac_modules", index: "IDX_iac_modules_organization_id" },
      { table: "iac_runs", index: "IDX_iac_runs_organization_id" },
      { table: "iac_stacks", index: "IDX_iac_stacks_organization_id" },
    ];

    for (const { table, index } of tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "organization_id"`,
      );
    }
  }
}
