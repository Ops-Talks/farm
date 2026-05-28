import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddTokenVersionToUsers
 *
 * Adds a `tokenVersion` integer column to the `users` table.  The JWT
 * strategy validates this value against the claim in the token, enabling
 * instant invalidation of all outstanding access-tokens for a user when
 * their password changes or an admin explicitly revokes sessions.
 *
 * TypeORM's synchronize flag handles column creation in SQLite during tests.
 * For PostgreSQL (production / CI migration-integrity job) we add the column
 * with a DEFAULT so that existing rows are back-filled in one DDL statement
 * without a separate UPDATE pass.
 */
export class AddTokenVersionToUsers1776800000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenVersion"
    `);
  }
}
