import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddIacResourceEntities
 * Creates iac_resources and iac_resource_dependencies tables for the
 * Resource Map feature (FARM-S286 / FARM-E69).
 */
export class AddIacResourceEntities1775300000001 implements MigrationInterface {
  name = "AddIacResourceEntities1775300000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "iac_resources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stackId" character varying NOT NULL,
        "address" character varying NOT NULL,
        "resourceType" character varying NOT NULL,
        "resourceName" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_iac_resources" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_resources_stackId" ON "iac_resources" ("stackId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "iac_resource_dependencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stackId" character varying NOT NULL,
        "sourceAddress" character varying NOT NULL,
        "targetAddress" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_iac_resource_dependencies" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_iac_resource_dependencies_stackId" ON "iac_resource_dependencies" ("stackId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_iac_resource_dependencies_stackId"`,
    );
    await queryRunner.query(`DROP TABLE "iac_resource_dependencies"`);
    await queryRunner.query(`DROP INDEX "IDX_iac_resources_stackId"`);
    await queryRunner.query(`DROP TABLE "iac_resources"`);
  }
}
