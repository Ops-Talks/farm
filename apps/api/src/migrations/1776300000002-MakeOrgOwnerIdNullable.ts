import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 37 follow-up — make `organizations.ownerId` nullable to support the
 * seed flow that creates organizations before users (chicken-and-egg
 * resolution: orgs are created with ownerId=NULL and patched once the
 * owning persona is seeded). Existing rows are unaffected.
 */
export class MakeOrgOwnerIdNullable1776300000002 implements MigrationInterface {
  name = "MakeOrgOwnerIdNullable1776300000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "ownerId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "ownerId" SET NOT NULL`,
    );
  }
}
