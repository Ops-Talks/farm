import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: add helmChart JSON column to the components table.
 * Stores optional Helm chart metadata (repo, chart, version, valuesRef)
 * as a JSON blob.
 */
export class AddHelmChartMetadata1773900000000 implements MigrationInterface {
  name = "AddHelmChartMetadata1773900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "components" ADD COLUMN "helmChart" jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "components" DROP COLUMN "helmChart"`);
  }
}
