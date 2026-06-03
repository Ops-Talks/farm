import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the integration_credentials table and adds argocd_app
 * nullable varchar column to the components table.
 */
export class AddIntegrationCredentials1773910000000 implements MigrationInterface {
  name = "AddIntegrationCredentials1773910000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create integration_credentials table
    await queryRunner.query(`
      CREATE TABLE "integration_credentials" (
        "id"             uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "orgId"          uuid,
        "type"           varchar           NOT NULL,
        "name"           varchar           NOT NULL,
        "encryptedValue" text              NOT NULL,
        "metadata"       jsonb,
        "createdAt"      timestamp         NOT NULL DEFAULT now(),
        "updatedAt"      timestamp         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_credentials" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_integration_credentials_orgId" ON "integration_credentials" ("orgId")`,
    );
    // Add argocdApp column to components
    await queryRunner.query(
      `ALTER TABLE "components" ADD COLUMN IF NOT EXISTS "argocdApp" varchar`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "components" DROP COLUMN IF EXISTS "argocdApp"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_integration_credentials_orgId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_credentials"`);
  }
}
