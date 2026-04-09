import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the flux_bindings table for binding Flux Kustomizations
 * and HelmReleases to catalog components (Phase 18, FARM-S248 / FARM-S249).
 */
export class AddFluxBindings1774700000001 implements MigrationInterface {
  name = "AddFluxBindings1774700000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "flux_bindings" (
          "id"                 uuid              NOT NULL DEFAULT gen_random_uuid(),
          "resourceKind"       character varying NOT NULL,
          "resourceName"       character varying NOT NULL,
          "resourceNamespace"  character varying NOT NULL,
          "componentId"        uuid              NOT NULL,
          "boundAt"            TIMESTAMP         NOT NULL DEFAULT NOW(),
          "organizationId"     uuid,
          CONSTRAINT "PK_flux_bindings" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_flux_binding" UNIQUE ("resourceKind", "resourceName", "resourceNamespace", "componentId"),
          CONSTRAINT "FK_flux_bindings_component" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_flux_bindings_componentId" ON "flux_bindings" ("componentId")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_flux_bindings_organizationId" ON "flux_bindings" ("organizationId")`,
      );
    } else {
      await queryRunner.query(`
        CREATE TABLE "flux_bindings" (
          "id"                 varchar           PRIMARY KEY NOT NULL,
          "resourceKind"       varchar(255)      NOT NULL,
          "resourceName"       varchar(255)      NOT NULL,
          "resourceNamespace"  varchar(255)      NOT NULL,
          "componentId"        varchar           NOT NULL,
          "boundAt"            datetime          NOT NULL DEFAULT (datetime('now')),
          "organizationId"     varchar(255),
          CONSTRAINT "UQ_flux_binding" UNIQUE ("resourceKind", "resourceName", "resourceNamespace", "componentId"),
          CONSTRAINT "FK_flux_bindings_component" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(
        `CREATE INDEX "IDX_flux_bindings_componentId" ON "flux_bindings" ("componentId")`,
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_flux_bindings_organizationId" ON "flux_bindings" ("organizationId")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_flux_bindings_organizationId"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_flux_bindings_componentId"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "flux_bindings"`);
  }
}
