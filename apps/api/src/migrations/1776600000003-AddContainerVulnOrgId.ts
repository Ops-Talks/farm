import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds nullable organization_id column to the container_vulnerabilities table.
 * Enables per-tenant vulnerability isolation in the Registry module.
 */
export class AddContainerVulnOrgId1776600000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_container_vulnerabilities_organization_id"
       ON "container_vulnerabilities" ("organization_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_container_vulnerabilities_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "container_vulnerabilities" DROP COLUMN IF EXISTS "organization_id"`,
    );
  }
}
