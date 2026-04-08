import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: creates container_vulnerabilities table to store CVE scan results
 * per component image tag, supporting vulnerability surface (Phase 17, FARM-S244).
 */
export class AddContainerVulnerabilities1774600000002 implements MigrationInterface {
  name = 'AddContainerVulnerabilities1774600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "container_vulnerabilities" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "componentId"      varchar NOT NULL,
        "registry"         varchar NOT NULL,
        "image"            varchar NOT NULL,
        "tag"              varchar NOT NULL,
        "severity"         varchar NOT NULL,
        "cveId"            varchar NOT NULL,
        "packageName"      varchar NOT NULL,
        "installedVersion" varchar,
        "fixedVersion"     varchar,
        "description"      text,
        "scannedAt"        TIMESTAMP NOT NULL,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_container_vulnerabilities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_container_vuln_component"
        ON "container_vulnerabilities" ("componentId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_container_vuln_unique"
        ON "container_vulnerabilities" ("componentId", "cveId", "tag")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "container_vulnerabilities"`);
  }
}
