import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: Phase37UserSignupAndInvitations
 *
 * Adds Phase 37 schema for user signup + organization invitations + user
 * management:
 *   - users.suspended (boolean, default false)
 *   - users.lastLogin (timestamp, nullable)
 *   - invitation_tokens table (token-based org invites)
 *   - password_resets table (admin-initiated temp password)
 */
export class Phase37UserSignupAndInvitations1776300000001 implements MigrationInterface {
  name = "Phase37UserSignupAndInvitations1776300000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `CREATE TABLE "invitation_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying(128) NOT NULL,
        "type" character varying NOT NULL DEFAULT 'org-invite',
        "email" character varying(255) NOT NULL,
        "orgId" character varying(64) NOT NULL,
        "invitedBy" character varying(64) NOT NULL,
        "role" character varying NOT NULL,
        "message" character varying(1024),
        "status" character varying NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "acceptedAt" TIMESTAMP WITH TIME ZONE,
        "acceptedBy" character varying(64),
        CONSTRAINT "PK_invitation_tokens" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invitation_tokens_token" ON "invitation_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitation_tokens_email_org" ON "invitation_tokens" ("email", "orgId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitation_tokens_status_created" ON "invitation_tokens" ("status", "createdAt")`,
    );

    await queryRunner.query(
      `CREATE TABLE "password_resets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(64) NOT NULL,
        "tempPasswordHash" character varying(128) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_password_resets" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_password_resets_userId" ON "password_resets" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_resets_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "password_resets"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invitation_tokens_status_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invitation_tokens_email_org"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invitation_tokens_token"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "invitation_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "lastLogin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "suspended"`,
    );
  }
}
