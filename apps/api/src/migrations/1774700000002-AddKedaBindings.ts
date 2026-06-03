import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKedaBindings1774700000002 implements MigrationInterface {
  name = "AddKedaBindings1774700000002";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "keda_bindings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "scaledObjectName" character varying NOT NULL,
        "scaledObjectNamespace" character varying NOT NULL,
        "componentId" uuid NOT NULL,
        "boundAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "organizationId" uuid,
        CONSTRAINT "PK_keda_bindings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_keda_binding" UNIQUE ("scaledObjectName", "scaledObjectNamespace", "componentId"),
        CONSTRAINT "FK_keda_bindings_component" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_keda_bindings_componentId" ON "keda_bindings" ("componentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_keda_bindings_organizationId" ON "keda_bindings" ("organizationId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_keda_bindings_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_keda_bindings_componentId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "keda_bindings"`);
  }
}
