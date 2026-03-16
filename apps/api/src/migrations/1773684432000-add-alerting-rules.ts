import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlertingRules1773684432000 implements MigrationInterface {
  name = "AddAlertingRules1773684432000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."alerting_rules_severity_enum" AS ENUM(
        'critical', 'warning', 'info'
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "alerting_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "query" text NOT NULL,
        "duration" character varying NOT NULL,
        "severity" "public"."alerting_rules_severity_enum" NOT NULL DEFAULT 'warning',
        "componentId" character varying,
        "environmentId" character varying,
        "labels" text,
        "annotations" text,
        "enabled" boolean NOT NULL DEFAULT true,
        "organizationId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_alerting_rules_name" UNIQUE ("name"),
        CONSTRAINT "PK_alerting_rules" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_alerting_rules_componentId" ON "alerting_rules" ("componentId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_alerting_rules_environmentId" ON "alerting_rules" ("environmentId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_alerting_rules_organizationId" ON "alerting_rules" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_alerting_rules_organizationId"`);
    await queryRunner.query(`DROP INDEX "IDX_alerting_rules_environmentId"`);
    await queryRunner.query(`DROP INDEX "IDX_alerting_rules_componentId"`);
    await queryRunner.query(`DROP TABLE "alerting_rules"`);
    await queryRunner.query(
      `DROP TYPE "public"."alerting_rules_severity_enum"`,
    );
  }
}
