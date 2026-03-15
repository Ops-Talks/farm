import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLog1773257386800 implements MigrationInterface {
  name = "AddAuditLog1773257386800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"action" character varying NOT NULL, ` +
        `"resourceType" character varying NOT NULL, ` +
        `"resourceId" character varying NOT NULL, ` +
        `"actorId" character varying NOT NULL, ` +
        `"actorUsername" character varying NOT NULL, ` +
        `"payload" jsonb, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")` +
        `)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resourceType" ON "audit_logs" ("resourceType")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resourceId" ON "audit_logs" ("resourceId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actorId" ON "audit_logs" ("actorId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_actorId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_resourceId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_resourceType"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
