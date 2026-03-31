import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the operator_bindings table for binding Kubernetes
 * operators to catalog components (FARM-T155 / FARM-T156).
 */
export class AddOperatorBindings1774400000001 implements MigrationInterface {
  name = "AddOperatorBindings1774400000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "operator_bindings" (
          "id"                  uuid              NOT NULL DEFAULT uuid_generate_v4(),
          "operatorName"        varchar(255)      NOT NULL,
          "operatorNamespace"   varchar(255)      NOT NULL,
          "componentId"         uuid              NOT NULL,
          "addedAt"             TIMESTAMP         NOT NULL DEFAULT now(),
          "organizationId"      varchar(255),
          CONSTRAINT "PK_operator_bindings" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_operator_binding" UNIQUE ("operatorName", "operatorNamespace", "componentId"),
          CONSTRAINT "FK_operator_binding_component" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_operator_bindings_component_id" ON "operator_bindings" ("componentId")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_operator_bindings_organization_id" ON "operator_bindings" ("organizationId")`,
      );
    } else {
      await queryRunner.query(`
        CREATE TABLE "operator_bindings" (
          "id"                  varchar           PRIMARY KEY NOT NULL,
          "operatorName"        varchar(255)      NOT NULL,
          "operatorNamespace"   varchar(255)      NOT NULL,
          "componentId"         varchar           NOT NULL,
          "addedAt"             datetime          NOT NULL DEFAULT (datetime('now')),
          "organizationId"      varchar(255),
          CONSTRAINT "UQ_operator_binding" UNIQUE ("operatorName", "operatorNamespace", "componentId"),
          CONSTRAINT "FK_operator_binding_component" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_operator_bindings_component_id" ON "operator_bindings" ("componentId")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_operator_bindings_organization_id" ON "operator_bindings" ("organizationId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_operator_bindings_organization_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_operator_bindings_component_id"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "operator_bindings"`);
  }
}
