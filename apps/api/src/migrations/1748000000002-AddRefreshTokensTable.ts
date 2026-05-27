import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddRefreshTokensTable
 *
 * Phase 53 S595: Replaces the single `users.refreshToken` varchar column with
 * a dedicated `refresh_tokens` table.  Key improvements:
 *
 * - Multiple devices can hold independent, simultaneously valid refresh tokens.
 * - Token families enable reuse detection: presenting a revoked token
 *   immediately invalidates every token in the same family.
 * - Tokens are stored as SHA-256 digests (jti) — the plaintext never touches
 *   the database.
 *
 * The `users.refreshToken` column is dropped in the same transaction so that
 * the application's entity layer stays consistent with the schema.
 */
export class AddRefreshTokensTable1748000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"        uuid          NOT NULL DEFAULT gen_random_uuid(),
        "userId"    varchar       NOT NULL,
        "jti"       varchar       NOT NULL,
        "familyId"  varchar,
        "issuedAt"  timestamp     NOT NULL,
        "expiresAt" timestamp     NOT NULL,
        "revokedAt" timestamp,
        "userAgent" varchar,
        "ip"        varchar,
        "createdAt" timestamp     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_jti" UNIQUE ("jti"),
        CONSTRAINT "FK_refresh_tokens_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId"
      ON "refresh_tokens" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_jti"
      ON "refresh_tokens" ("jti")
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshToken"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "refreshToken" varchar
    `);
  }
}
