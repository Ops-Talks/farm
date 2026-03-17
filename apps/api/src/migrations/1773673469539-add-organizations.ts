import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizations1773673469539 implements MigrationInterface {
  name = "AddOrganizations1773673469539";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the organizations table
    await queryRunner.query(
      `CREATE TABLE "organizations" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"name" character varying NOT NULL, ` +
        `"slug" character varying NOT NULL, ` +
        `"description" character varying, ` +
        `"ownerId" uuid NOT NULL, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "UQ_organizations_name" UNIQUE ("name"), ` +
        `CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"), ` +
        `CONSTRAINT "PK_organizations" PRIMARY KEY ("id")` +
        `)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_organizations_slug" ON "organizations" ("slug")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_organizations_ownerId" ON "organizations" ("ownerId")`,
    );

    // Create the user_organizations join table
    await queryRunner.query(
      `CREATE TABLE "user_organizations" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"organizationId" uuid NOT NULL, ` +
        `"role" character varying NOT NULL DEFAULT 'member', ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "UQ_user_organizations_userId_organizationId" UNIQUE ("userId", "organizationId"), ` +
        `CONSTRAINT "PK_user_organizations" PRIMARY KEY ("id")` +
        `)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_user_organizations_userId" ON "user_organizations" ("userId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_user_organizations_organizationId" ON "user_organizations" ("organizationId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_organizations" ` +
        `ADD CONSTRAINT "FK_user_organizations_userId" ` +
        `FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_organizations" ` +
        `ADD CONSTRAINT "FK_user_organizations_organizationId" ` +
        `FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
    );

    // Add organizationId FK (nullable) to components
    await queryRunner.query(
      `ALTER TABLE "components" ADD COLUMN "organizationId" character varying`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_components_organizationId" ON "components" ("organizationId")`,
    );

    // Add organizationId FK (nullable) to teams
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN "organizationId" character varying`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_teams_organizationId" ON "teams" ("organizationId")`,
    );

    // Add organizationId FK (nullable) to environments
    await queryRunner.query(
      `ALTER TABLE "environments" ADD COLUMN "organizationId" character varying`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_environments_organizationId" ON "environments" ("organizationId")`,
    );

    // Add organizationId FK (nullable) to audit_logs
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN "organizationId" character varying`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_organizationId" ON "audit_logs" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove organizationId indexes and columns from tables
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "organizationId"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_environments_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "environments" DROP COLUMN "organizationId"`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_teams_organizationId"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "organizationId"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_components_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "components" DROP COLUMN "organizationId"`,
    );

    // Drop user_organizations table
    await queryRunner.query(
      `ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_user_organizations_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_user_organizations_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_organizations_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_organizations_userId"`,
    );
    await queryRunner.query(`DROP TABLE "user_organizations"`);

    // Drop organizations table
    await queryRunner.query(`DROP INDEX "public"."IDX_organizations_ownerId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_organizations_slug"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
  }
}
