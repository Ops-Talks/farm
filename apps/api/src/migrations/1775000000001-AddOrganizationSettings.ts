import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the settings JSON column to the organizations table.
 * Stores arbitrary key/value configuration per organization,
 * including the dismissed setup checklist items list.
 */
export class AddOrganizationSettings1775000000001 implements MigrationInterface {
  name = "AddOrganizationSettings1775000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "settings" text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN IF EXISTS "settings"`,
    );
  }
}
