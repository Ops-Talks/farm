import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: adds the organizationId column and index to the documentation,
 * api_specs, and gateway_routes tables for workspace/org isolation (FARM-E49
 * Phase A).
 */
export class AddOrgIdToPhase11Entities1774000000001 implements MigrationInterface {
  name = "AddOrgIdToPhase11Entities1774000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // documentation
    await queryRunner.query(
      `ALTER TABLE "documentation" ADD COLUMN "organizationId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documentation_organizationId" ON "documentation" ("organizationId")`,
    );

    // api_specs
    await queryRunner.query(
      `ALTER TABLE "api_specs" ADD COLUMN "organizationId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_specs_organizationId" ON "api_specs" ("organizationId")`,
    );

    // gateway_routes
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ADD COLUMN "organizationId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_gateway_routes_organizationId" ON "gateway_routes" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // gateway_routes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_gateway_routes_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" DROP COLUMN "organizationId"`,
    );

    // api_specs
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_api_specs_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_specs" DROP COLUMN "organizationId"`,
    );

    // documentation
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_documentation_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" DROP COLUMN "organizationId"`,
    );
  }
}
