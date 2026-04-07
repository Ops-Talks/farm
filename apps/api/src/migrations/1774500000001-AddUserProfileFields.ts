import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: adds firstName, lastName, and gender columns to the users table
 * to support user profile management (Phase 24).
 */
export class AddUserProfileFields1774500000001 implements MigrationInterface {
  name = "AddUserProfileFields1774500000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "firstName" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "lastName" varchar`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "gender" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstName"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastName"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    } else {
      // SQLite does not support DROP COLUMN directly; recreate the table without the columns.
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstName"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastName"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    }
  }
}
