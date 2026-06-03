import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDashboards1774200000003 implements MigrationInterface {
  name = "AddDashboards1774200000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // dashboards table
    // ----------------------------------------------------------------
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

    await queryRunner.query(
      `CREATE INDEX "IDX_dashboards_organizationId" ON "dashboards" ("organizationId")`,
    );

    // ----------------------------------------------------------------
    // dashboard_widgets table
    // ----------------------------------------------------------------
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

    await queryRunner.query(
      `CREATE INDEX "IDX_dashboard_widgets_dashboardId" ON "dashboard_widgets" ("dashboardId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets"
        ADD CONSTRAINT "FK_dashboard_widgets_dashboardId"
        FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_dashboard_widgets_dashboardId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_dashboard_widgets_dashboardId"`);
    await queryRunner.query(`DROP TABLE "dashboard_widgets"`);

    await queryRunner.query(`DROP INDEX "IDX_dashboards_organizationId"`);
    await queryRunner.query(`DROP TABLE "dashboards"`);
  }
}
