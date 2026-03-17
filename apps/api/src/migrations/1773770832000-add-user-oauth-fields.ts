import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: add oauthProvider and oauthProviderId columns to the users table.
 * These nullable columns support OAuth2 social login (GitHub, Google).
 */
export class AddUserOauthFields1773770832000 implements MigrationInterface {
  name = "AddUserOauthFields1773770832000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "oauthProvider" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "oauthProviderId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_oauthProviderId" ON "users" ("oauthProviderId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_oauthProviderId"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "oauthProviderId"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "oauthProvider"`);
  }
}
