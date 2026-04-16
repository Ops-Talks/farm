import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: UpdateIacModuleProvider
 * - Replaces the iac_modules_provider_enum (terraform/opentofu/pulumi) with
 *   cloud/infrastructure provider values (aws, gcp, azure, ...).
 * - Adds the "engine" column (varchar, nullable) to store the IaC toolchain.
 */
export class UpdateIacModuleProvider1775200000002 implements MigrationInterface {
  name = "UpdateIacModuleProvider1775200000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add engine column to hold the previous "provider" concept (terraform/opentofu/pulumi).
    await queryRunner.query(
      `ALTER TABLE "iac_modules" ADD COLUMN IF NOT EXISTS "engine" character varying`,
    );

    // Change provider column type from the old enum to varchar BEFORE updating values.
    await queryRunner.query(
      `ALTER TABLE "iac_modules" ALTER COLUMN "provider" TYPE character varying USING "provider"::text`,
    );

    // Drop the old enum type now that the column is varchar.
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."iac_modules_provider_enum"`,
    );

    // Migrate existing rows: move current provider value → engine, set provider to 'generic'.
    await queryRunner.query(
      `UPDATE "iac_modules" SET "engine" = "provider", "provider" = 'generic' WHERE "provider" IN ('terraform', 'opentofu', 'pulumi')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the old enum and restore the column type.
    await queryRunner.query(
      `CREATE TYPE "public"."iac_modules_provider_enum" AS ENUM('terraform', 'opentofu', 'pulumi')`,
    );

    await queryRunner.query(
      `ALTER TABLE "iac_modules" ALTER COLUMN "provider" TYPE "public"."iac_modules_provider_enum" USING (
        CASE WHEN "engine" IN ('terraform','opentofu','pulumi') THEN "engine"::"public"."iac_modules_provider_enum"
             ELSE 'terraform'::"public"."iac_modules_provider_enum"
        END
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "iac_modules" DROP COLUMN IF EXISTS "engine"`,
    );
  }
}
