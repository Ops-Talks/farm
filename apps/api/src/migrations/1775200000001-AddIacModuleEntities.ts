import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddIacModuleEntities
 * Creates iac_modules and iac_module_versions tables for the
 * IaC Module Catalog feature (FARM-E68).
 */
export class AddIacModuleEntities1775200000001 implements MigrationInterface {
  name = "AddIacModuleEntities1775200000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."iac_modules_provider_enum" AS ENUM('terraform', 'opentofu', 'pulumi')`,
    );

    await queryRunner.query(
      `CREATE TABLE "iac_modules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "provider" "public"."iac_modules_provider_enum" NOT NULL,
        "sourceRepoUrl" character varying NOT NULL,
        "description" character varying,
        "latestVersion" character varying,
        "componentId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_iac_modules" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_modules_name" ON "iac_modules" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iac_modules_componentId" ON "iac_modules" ("componentId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "iac_module_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "moduleId" uuid NOT NULL,
        "version" character varying NOT NULL,
        "variablesMeta" text,
        "outputsMeta" text,
        "syncedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_iac_module_versions_module_version" UNIQUE ("moduleId", "version"),
        CONSTRAINT "PK_iac_module_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_iac_module_versions_moduleId" FOREIGN KEY ("moduleId")
          REFERENCES "iac_modules" ("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_module_versions_moduleId" ON "iac_module_versions" ("moduleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iac_module_versions_version" ON "iac_module_versions" ("version")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_module_versions_version"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_module_versions_moduleId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "iac_module_versions"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_iac_modules_componentId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_iac_modules_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "iac_modules"`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."iac_modules_provider_enum"`,
    );
  }
}
