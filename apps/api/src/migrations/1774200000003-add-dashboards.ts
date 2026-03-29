import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDashboards1774200000003 implements MigrationInterface {
  name = "AddDashboards1774200000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === "postgres";

    // ----------------------------------------------------------------
    // dashboards table
    // ----------------------------------------------------------------
    if (isPostgres) {
      await queryRunner.query(
        `CREATE TABLE "dashboards" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" character varying NOT NULL,
          "description" character varying,
          "ownerId" character varying NOT NULL,
          "visibility" character varying NOT NULL DEFAULT 'private',
          "organizationId" character varying,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_dashboards" PRIMARY KEY ("id")
        )`,
      );
    } else {
      await queryRunner.query(
        `CREATE TABLE "dashboards" (
          "id" varchar PRIMARY KEY NOT NULL,
          "name" varchar NOT NULL,
          "description" varchar,
          "ownerId" varchar NOT NULL,
          "visibility" varchar NOT NULL DEFAULT ('private'),
          "organizationId" varchar,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
        )`,
      );
    }

    await queryRunner.query(
      `CREATE INDEX "IDX_dashboards_organizationId" ON "dashboards" ("organizationId")`,
    );

    // ----------------------------------------------------------------
    // dashboard_widgets table
    // ----------------------------------------------------------------
    if (isPostgres) {
      await queryRunner.query(
        `CREATE TABLE "dashboard_widgets" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "dashboardId" uuid NOT NULL,
          "type" character varying NOT NULL,
          "title" character varying NOT NULL,
          "gridX" integer NOT NULL DEFAULT 0,
          "gridY" integer NOT NULL DEFAULT 0,
          "gridW" integer NOT NULL DEFAULT 4,
          "gridH" integer NOT NULL DEFAULT 3,
          "config" text,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_dashboard_widgets" PRIMARY KEY ("id")
        )`,
      );
    } else {
      await queryRunner.query(
        `CREATE TABLE "dashboard_widgets" (
          "id" varchar PRIMARY KEY NOT NULL,
          "dashboardId" varchar NOT NULL,
          "type" varchar NOT NULL,
          "title" varchar NOT NULL,
          "gridX" integer NOT NULL DEFAULT (0),
          "gridY" integer NOT NULL DEFAULT (0),
          "gridW" integer NOT NULL DEFAULT (4),
          "gridH" integer NOT NULL DEFAULT (3),
          "config" text,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
        )`,
      );
    }

    await queryRunner.query(
      `CREATE INDEX "IDX_dashboard_widgets_dashboardId" ON "dashboard_widgets" ("dashboardId")`,
    );

    // Foreign key (PostgreSQL only; SQLite does not support ALTER TABLE ADD CONSTRAINT)
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets"
          ADD CONSTRAINT "FK_dashboard_widgets_dashboardId"
          FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === "postgres";

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_dashboard_widgets_dashboardId"`,
      );
    }

    await queryRunner.query(`DROP INDEX "IDX_dashboard_widgets_dashboardId"`);
    await queryRunner.query(`DROP TABLE "dashboard_widgets"`);

    await queryRunner.query(`DROP INDEX "IDX_dashboards_organizationId"`);
    await queryRunner.query(`DROP TABLE "dashboards"`);
  }
}
