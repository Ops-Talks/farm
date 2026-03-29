import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: creates the incidents, incident_components, incident_environments,
 * incident_updates, and post_mortems tables for the Incident Management module
 * (FARM-E52).
 */
export class AddIncidents1774200000002 implements MigrationInterface {
  name = "AddIncidents1774200000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      // ── incidents ───────────────────────────────────────────────────
      await queryRunner.query(`
        CREATE TABLE "incidents" (
          "id"               uuid           NOT NULL DEFAULT uuid_generate_v4(),
          "title"            varchar        NOT NULL,
          "description"      text,
          "severity"         varchar        NOT NULL,
          "status"           varchar        NOT NULL DEFAULT 'open',
          "commanderUserId"  uuid,
          "organizationId"   uuid,
          "resolvedAt"       timestamptz,
          "createdAt"        timestamptz    NOT NULL DEFAULT now(),
          "updatedAt"        timestamptz    NOT NULL DEFAULT now(),
          CONSTRAINT "PK_incidents" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_incidents_organization_id"
          ON "incidents" ("organizationId")
      `);

      // ── incident_components (join table) ────────────────────────────
      await queryRunner.query(`
        CREATE TABLE "incident_components" (
          "incidentsId"  uuid NOT NULL,
          "componentsId" uuid NOT NULL,
          CONSTRAINT "PK_incident_components"
            PRIMARY KEY ("incidentsId", "componentsId"),
          CONSTRAINT "FK_incident_components_incident"
            FOREIGN KEY ("incidentsId")
            REFERENCES "incidents"("id")
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "FK_incident_components_component"
            FOREIGN KEY ("componentsId")
            REFERENCES "components"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_incident_components_incident"
          ON "incident_components" ("incidentsId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_incident_components_component"
          ON "incident_components" ("componentsId")
      `);

      // ── incident_environments (join table) ──────────────────────────
      await queryRunner.query(`
        CREATE TABLE "incident_environments" (
          "incidentsId"    uuid NOT NULL,
          "environmentsId" uuid NOT NULL,
          CONSTRAINT "PK_incident_environments"
            PRIMARY KEY ("incidentsId", "environmentsId"),
          CONSTRAINT "FK_incident_environments_incident"
            FOREIGN KEY ("incidentsId")
            REFERENCES "incidents"("id")
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "FK_incident_environments_environment"
            FOREIGN KEY ("environmentsId")
            REFERENCES "environments"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_incident_environments_incident"
          ON "incident_environments" ("incidentsId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_incident_environments_environment"
          ON "incident_environments" ("environmentsId")
      `);

      // ── incident_updates ────────────────────────────────────────────
      await queryRunner.query(`
        CREATE TABLE "incident_updates" (
          "id"             uuid        NOT NULL DEFAULT uuid_generate_v4(),
          "incidentId"     uuid        NOT NULL,
          "authorId"       uuid,
          "message"        text        NOT NULL,
          "previousStatus" varchar,
          "newStatus"      varchar,
          "createdAt"      timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_incident_updates" PRIMARY KEY ("id"),
          CONSTRAINT "FK_incident_updates_incident"
            FOREIGN KEY ("incidentId")
            REFERENCES "incidents"("id")
            ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_incident_updates_incident_id"
          ON "incident_updates" ("incidentId")
      `);

      // ── post_mortems ────────────────────────────────────────────────
      await queryRunner.query(`
        CREATE TABLE "post_mortems" (
          "id"                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
          "incidentId"          uuid        NOT NULL,
          "rootCause"           text        NOT NULL,
          "contributingFactors" text,
          "actionItems"         text,
          "body"                text,
          "approvedBy"          uuid,
          "approvedAt"          timestamptz,
          "organizationId"      uuid,
          "createdAt"           timestamptz NOT NULL DEFAULT now(),
          "updatedAt"           timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_post_mortems" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_post_mortems_incident"
            UNIQUE ("incidentId"),
          CONSTRAINT "FK_post_mortems_incident"
            FOREIGN KEY ("incidentId")
            REFERENCES "incidents"("id")
            ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_post_mortems_organization_id"
          ON "post_mortems" ("organizationId")
      `);
    } else {
      // ── SQLite (used in E2E / unit tests via better-sqlite3) ────────

      await queryRunner.query(`
        CREATE TABLE "incidents" (
          "id"               varchar    NOT NULL,
          "title"            varchar    NOT NULL,
          "description"      text,
          "severity"         varchar    NOT NULL,
          "status"           varchar    NOT NULL DEFAULT 'open',
          "commanderUserId"  varchar,
          "organizationId"   varchar,
          "resolvedAt"       datetime,
          "createdAt"        datetime   NOT NULL DEFAULT (datetime('now')),
          "updatedAt"        datetime   NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "incident_components" (
          "incidentsId"  varchar NOT NULL,
          "componentsId" varchar NOT NULL,
          PRIMARY KEY ("incidentsId", "componentsId"),
          FOREIGN KEY ("incidentsId")  REFERENCES "incidents"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("componentsId") REFERENCES "components"("id")  ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "incident_environments" (
          "incidentsId"    varchar NOT NULL,
          "environmentsId" varchar NOT NULL,
          PRIMARY KEY ("incidentsId", "environmentsId"),
          FOREIGN KEY ("incidentsId")    REFERENCES "incidents"("id")      ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("environmentsId") REFERENCES "environments"("id")   ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "incident_updates" (
          "id"             varchar   NOT NULL,
          "incidentId"     varchar   NOT NULL,
          "authorId"       varchar,
          "message"        text      NOT NULL,
          "previousStatus" varchar,
          "newStatus"      varchar,
          "createdAt"      datetime  NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id"),
          FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "post_mortems" (
          "id"                  varchar   NOT NULL,
          "incidentId"          varchar   NOT NULL UNIQUE,
          "rootCause"           text      NOT NULL,
          "contributingFactors" text,
          "actionItems"         text,
          "body"                text,
          "approvedBy"          varchar,
          "approvedAt"          datetime,
          "organizationId"      varchar,
          "createdAt"           datetime  NOT NULL DEFAULT (datetime('now')),
          "updatedAt"           datetime  NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY ("id"),
          FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_post_mortems_organization_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_incident_updates_incident_id"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_incident_environments_environment"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_incident_environments_incident"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_incident_components_component"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_incident_components_incident"`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_incidents_organization_id"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "post_mortems"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_updates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_environments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident_components"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incidents"`);
  }
}
