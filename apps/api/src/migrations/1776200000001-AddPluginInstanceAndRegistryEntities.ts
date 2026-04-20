import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddPluginInstanceAndRegistryEntities
 * Creates plugin_instances and plugin_registry tables for Phase 30
 * Plugin Ecosystem (FARM-T358, FARM-T356).
 */
export class AddPluginInstanceAndRegistryEntities1776200000001
  implements MigrationInterface
{
  name = "AddPluginInstanceAndRegistryEntities1776200000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."plugin_instances_status_enum" AS ENUM('installing', 'active', 'disabled', 'error')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."plugin_instances_healthstatus_enum" AS ENUM('healthy', 'degraded', 'unknown')`,
    );

    await queryRunner.query(
      `CREATE TABLE "plugin_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pluginId" character varying NOT NULL,
        "orgId" character varying,
        "version" character varying NOT NULL,
        "status" "public"."plugin_instances_status_enum" NOT NULL DEFAULT 'installing',
        "healthStatus" "public"."plugin_instances_healthstatus_enum" NOT NULL DEFAULT 'unknown',
        "config" jsonb,
        "manifest" jsonb,
        "installedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plugin_instances" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_instances_pluginId" ON "plugin_instances" ("pluginId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_plugin_instances_orgId" ON "plugin_instances" ("orgId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "plugin_registry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pluginId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "latestVersion" character varying NOT NULL,
        "description" character varying NOT NULL,
        "author" character varying,
        "category" character varying,
        "manifest" jsonb NOT NULL,
        "installCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_plugin_registry_pluginId" UNIQUE ("pluginId"),
        CONSTRAINT "PK_plugin_registry" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_plugin_registry_pluginId" ON "plugin_registry" ("pluginId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_plugin_registry_pluginId"`,
    );
    await queryRunner.query(`DROP TABLE "plugin_registry"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_plugin_instances_orgId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_plugin_instances_pluginId"`,
    );
    await queryRunner.query(`DROP TABLE "plugin_instances"`);

    await queryRunner.query(
      `DROP TYPE "public"."plugin_instances_healthstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."plugin_instances_status_enum"`,
    );
  }
}
