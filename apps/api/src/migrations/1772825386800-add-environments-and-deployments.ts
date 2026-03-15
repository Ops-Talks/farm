import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnvironmentsAndDeployments1772825386800 implements MigrationInterface {
  name = "AddEnvironmentsAndDeployments1772825386800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "environments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "type" character varying NOT NULL DEFAULT 'development', "order" integer NOT NULL DEFAULT 0, "metadata" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_environments_name" UNIQUE ("name"), CONSTRAINT "PK_environments" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "deployments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "deployedBy" character varying, "commitSha" character varying, "description" character varying, "metadata" text, "componentId" uuid NOT NULL, "environmentId" uuid NOT NULL, "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_deployments" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "deployments" ADD CONSTRAINT "FK_deployments_componentId" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "deployments" ADD CONSTRAINT "FK_deployments_environmentId" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_deployments_componentId" ON "deployments" ("componentId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_deployments_environmentId" ON "deployments" ("environmentId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_deployments_status" ON "deployments" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_deployments_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_deployments_environmentId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_deployments_componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" DROP CONSTRAINT "FK_deployments_environmentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deployments" DROP CONSTRAINT "FK_deployments_componentId"`,
    );
    await queryRunner.query(`DROP TABLE "deployments"`);
    await queryRunner.query(`DROP TABLE "environments"`);
  }
}
