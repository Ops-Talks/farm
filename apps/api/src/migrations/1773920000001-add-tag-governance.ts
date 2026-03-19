import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTagGovernance1773920000001 implements MigrationInterface {
  name = "AddTagGovernance1773920000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tag_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orgId" character varying NOT NULL,
        "resourceType" character varying NOT NULL,
        "requiredKeys" text NOT NULL,
        "severity" character varying NOT NULL DEFAULT 'warning',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tag_policies" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_tag_policies_orgId" ON "tag_policies" ("orgId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "resource_violations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orgId" character varying NOT NULL,
        "resourceId" character varying NOT NULL,
        "resourceType" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "missingKeys" text NOT NULL,
        "linkedComponentId" character varying,
        "detectedAt" TIMESTAMP NOT NULL,
        "resolvedAt" TIMESTAMP,
        CONSTRAINT "PK_resource_violations" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_resource_violations_orgId" ON "resource_violations" ("orgId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_resource_violations_orgId_resourceId_resourceType"
        ON "resource_violations" ("orgId", "resourceId", "resourceType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_resource_violations_orgId_resourceId_resourceType"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_resource_violations_orgId"`);
    await queryRunner.query(`DROP TABLE "resource_violations"`);
    await queryRunner.query(`DROP INDEX "IDX_tag_policies_orgId"`);
    await queryRunner.query(`DROP TABLE "tag_policies"`);
  }
}
