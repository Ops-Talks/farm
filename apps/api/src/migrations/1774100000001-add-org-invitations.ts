import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the org_invitations table used for email-based
 * organization invitation flow (FARM-E50 S199).
 */
export class AddOrgInvitations1774100000001 implements MigrationInterface {
  name = "AddOrgInvitations1774100000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "org_invitations" (
          "id"              uuid              NOT NULL DEFAULT uuid_generate_v4(),
          "organizationId"  uuid              NOT NULL,
          "email"           varchar(255)      NOT NULL,
          "tokenHash"       varchar(64)       NOT NULL,
          "status"          varchar(20)       NOT NULL DEFAULT 'pending',
          "role"            varchar(20)       NOT NULL DEFAULT 'member',
          "expiresAt"       timestamptz       NOT NULL,
          "invitedByUserId" uuid,
          "createdAt"       timestamptz       NOT NULL DEFAULT now(),
          "updatedAt"       timestamptz       NOT NULL DEFAULT now(),
          CONSTRAINT "PK_org_invitations" PRIMARY KEY ("id"),
          CONSTRAINT "FK_org_invitations_org"
            FOREIGN KEY ("organizationId")
            REFERENCES "organizations"("id")
            ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_org_invitations_token_hash"
          ON "org_invitations" ("tokenHash")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_org_invitations_org_id"
          ON "org_invitations" ("organizationId")
      `);

      // Partial unique index: at most one pending invitation per (org, email).
      // Uses a WHERE clause so accepted/cancelled rows do not block re-invites.
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_org_invitations_pending_unique"
          ON "org_invitations" ("organizationId", "email")
          WHERE status = 'pending'
      `);
    } else {
      // SQLite (used in E2E / unit tests via better-sqlite3).
      // UUID columns become TEXT; timestamptz becomes DATETIME.
      await queryRunner.query(`
        CREATE TABLE "org_invitations" (
          "id"              varchar           NOT NULL,
          "organizationId"  varchar           NOT NULL,
          "email"           varchar(255)      NOT NULL,
          "tokenHash"       varchar(64)       NOT NULL UNIQUE,
          "status"          varchar(20)       NOT NULL DEFAULT 'pending',
          "role"            varchar(20)       NOT NULL DEFAULT 'member',
          "expiresAt"       datetime          NOT NULL,
          "invitedByUserId" varchar,
          "createdAt"       datetime          NOT NULL DEFAULT (datetime('now')),
          "updatedAt"       datetime          NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id"),
          FOREIGN KEY ("organizationId")
            REFERENCES "organizations"("id")
            ON DELETE CASCADE
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_org_invitations_pending_unique"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_org_invitations_org_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_org_invitations_token_hash"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "org_invitations"`);
  }
}
