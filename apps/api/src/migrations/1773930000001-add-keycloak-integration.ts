import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: adds the externalId column to the teams table for Keycloak
 * group sync support. The integration_type column is varchar — no PostgreSQL
 * enum type exists to alter.
 */
export class AddKeycloakIntegration1773930000001 implements MigrationInterface {
  name = "AddKeycloakIntegration1773930000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "externalId" varchar`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN IF EXISTS "externalId"`,
    );
  }
}
