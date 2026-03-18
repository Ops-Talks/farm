import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: add helmChart JSON column to the components table.
 * Stores optional Helm chart metadata (repo, chart, version, valuesRef)
 * as a JSON blob. Uses jsonb on PostgreSQL and text (simple-json) on SQLite.
 */
export class AddHelmChartMetadata1773900000000 implements MigrationInterface {
  name = "AddHelmChartMetadata1773900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "components" ADD COLUMN "helmChart" jsonb`,
      );
    } else {
      // SQLite does not support jsonb; use a plain text column that TypeORM
      // serialises/deserialises as simple-json.
      await queryRunner.query(
        `ALTER TABLE "components" ADD COLUMN "helmChart" text`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "components" DROP COLUMN "helmChart"`,
      );
    } else {
      // SQLite does not support DROP COLUMN in older versions; recreate the
      // table without the helmChart column.
      await queryRunner.query(
        `CREATE TABLE "components_backup" AS SELECT id, name, kind, description, owner, "teamId", lifecycle, tags, links, metadata, "organizationId", "createdAt", "updatedAt" FROM "components"`,
      );
      await queryRunner.query(`DROP TABLE "components"`);
      await queryRunner.query(
        `ALTER TABLE "components_backup" RENAME TO "components"`,
      );
    }
  }
}
