import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddComponentElasticsearchIndexEntity
 *
 * Creates the component_elasticsearch_indices table for Phase 35
 * (Elasticsearch Index Visibility - FARM-T401), linking one or more
 * Elasticsearch index patterns to a catalog component with an optional
 * per-record ES URL override.
 */
export class AddComponentElasticsearchIndexEntity1776200000002 implements MigrationInterface {
  name = "AddComponentElasticsearchIndexEntity1776200000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "component_elasticsearch_indices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "componentId" uuid NOT NULL,
        "indexPattern" character varying(255) NOT NULL,
        "esUrl" character varying,
        "description" character varying,
        "organizationId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_component_elasticsearch_indices" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_component_es_indices_componentId" ON "component_elasticsearch_indices" ("componentId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_component_es_indices_organizationId" ON "component_elasticsearch_indices" ("organizationId")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_component_es_indices_componentId_indexPattern" ON "component_elasticsearch_indices" ("componentId", "indexPattern")`,
    );

    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices"
       ADD CONSTRAINT "FK_component_es_indices_componentId"
       FOREIGN KEY ("componentId") REFERENCES "components"("id")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "component_elasticsearch_indices" DROP CONSTRAINT "FK_component_es_indices_componentId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_component_es_indices_componentId_indexPattern"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_component_es_indices_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_component_es_indices_componentId"`,
    );
    await queryRunner.query(`DROP TABLE "component_elasticsearch_indices"`);
  }
}
