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
    await queryRunner.dropColumns("users", ["firstName", "lastName", "gender"]);
  }
}
