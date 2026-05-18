import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Replaces the single-column unique constraint on pipelines.name and
 * environments.name with composite unique indexes that include organizationId,
 * enabling the same name to exist in different organizations.
 */
export class CompositeUniqueNameOrg1776600000005 implements MigrationInterface {
  name = "CompositeUniqueNameOrg1776600000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pipelines: drop old unique constraint, add composite unique index
    await queryRunner.query(
      `ALTER TABLE "pipelines" DROP CONSTRAINT IF EXISTS "UQ_pipelines_name"`,
    );
    // TypeORM generates unnamed unique constraints as unique indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pipelines_name_unique"`);
    // Drop the column-level unique constraint (TypeORM names it after the table+column)
    await queryRunner.query(
      `ALTER TABLE "pipelines" DROP CONSTRAINT IF EXISTS "pipelines_name_key"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_pipelines_name_org" ON "pipelines" ("name", "organizationId")`,
    );

    // Environments: add organizationId column (not present in the original creation
    // migration), then widen the unique constraint to include organizationId.
    await queryRunner.query(
      `ALTER TABLE "environments" ADD COLUMN IF NOT EXISTS "organizationId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_environments_organizationId"
       ON "environments" ("organizationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" DROP CONSTRAINT IF EXISTS "UQ_environments_name"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_environments_name_unique"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" DROP CONSTRAINT IF EXISTS "environments_name_key"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_environments_name_org" ON "environments" ("name", "organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pipelines_name_org"`);
    await queryRunner.query(
      `ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_name_key" UNIQUE ("name")`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_environments_name_org"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_environments_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" DROP COLUMN IF EXISTS "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" ADD CONSTRAINT "environments_name_key" UNIQUE ("name")`,
    );
  }
}
