import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: adds the externalId column to the teams table for Keycloak
 * group sync support. The integration_type column is varchar — no PostgreSQL
 * enum type exists to alter.
 */
export class AddKeycloakIntegration1773930000001 implements MigrationInterface {
  name = "AddKeycloakIntegration1773930000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "externalId" varchar`,
      );
    } else {
      // SQLite does not support IF NOT EXISTS for ADD COLUMN — check manually.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tableInfo: Array<{ name: string }> = await queryRunner.query(
        `PRAGMA table_info("teams")`,
      );
      const hasColumn = tableInfo.some((col) => col.name === "externalId");
      if (!hasColumn) {
        await queryRunner.query(
          `ALTER TABLE "teams" ADD COLUMN "externalId" varchar`,
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "teams" DROP COLUMN IF EXISTS "externalId"`,
      );
    }
  }
}
