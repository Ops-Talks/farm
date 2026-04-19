import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddDocumentationBuild
 * Creates the documentation_builds table to track build status and artifacts
 * produced when a component's documentation source is compiled (FARM-S324).
 */
export class AddDocumentationBuild1776000000001 implements MigrationInterface {
  name = "AddDocumentationBuild1776000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "documentation_builds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "componentId" character varying NOT NULL,
        "version" character varying NOT NULL DEFAULT 'unknown',
        "sourceType" character varying NOT NULL DEFAULT 'markdown',
        "status" character varying NOT NULL DEFAULT 'building',
        "buildLog" text,
        "artifactsPath" text,
        "triggeredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_documentation_builds" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_documentation_builds_componentId" ON "documentation_builds" ("componentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_documentation_builds_componentId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "documentation_builds"`);
  }
}
