import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddUserOrgRole
 *
 * This migration handles two concerns:
 *
 * 1. VIEWER role support — the user_organizations.role column is already typed
 *    as varchar with no CHECK constraint (intentionally, for SQLite/better-sqlite3
 *    E2E compatibility), so no schema change is required to accept the new
 *    "viewer" value.
 *
 * 2. Data backfill — ensures every organization has exactly one owner by
 *    promoting the member with the earliest `createdAt` (i.e. the founder) to
 *    "owner" when no owner currently exists.  This is a safety guard for
 *    organizations that may have been created before the ownership concept was
 *    enforced at the application layer.
 */
export class AddUserOrgRole1776700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Identify organizations that have no owner and promote the earliest member.
    // Uses a self-join so the UPDATE is portable across SQLite and PostgreSQL.
    await queryRunner.query(`
      UPDATE user_organizations
      SET role = 'owner'
      WHERE ("organizationId", "userId") IN (
        SELECT "organizationId", "userId"
        FROM user_organizations uo1
        WHERE uo1.role != 'owner'
          AND NOT EXISTS (
            SELECT 1 FROM user_organizations uo2
            WHERE uo2."organizationId" = uo1."organizationId"
              AND uo2.role = 'owner'
          )
          AND uo1."createdAt" = (
            SELECT MIN(uo3."createdAt")
            FROM user_organizations uo3
            WHERE uo3."organizationId" = uo1."organizationId"
          )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The backfill cannot be reliably reverted because we cannot distinguish
    // users who were always owners from those promoted by this migration.
    // The down migration is intentionally a no-op.
    await queryRunner.query(`SELECT 1`);
  }
}
