import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamsAndOwnership1772911786800 implements MigrationInterface {
  name = "AddTeamsAndOwnership1772911786800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "displayName" character varying NOT NULL, "description" character varying, "type" character varying NOT NULL DEFAULT 'other', "contactEmail" character varying, "slackChannel" character varying, "metadata" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_teams_name" UNIQUE ("name"), CONSTRAINT "PK_teams" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "team_members" ("teamId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_team_members" PRIMARY KEY ("teamId", "userId"))`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_team_members_teamId" ON "team_members" ("teamId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_team_members_userId" ON "team_members" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_team_members_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_team_members_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );

    await queryRunner.query(`ALTER TABLE "components" ADD "teamId" uuid`);

    await queryRunner.query(
      `ALTER TABLE "components" ADD CONSTRAINT "FK_components_teamId" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "components" DROP CONSTRAINT "FK_components_teamId"`,
    );
    await queryRunner.query(`ALTER TABLE "components" DROP COLUMN "teamId"`);
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_teamId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_team_members_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_team_members_teamId"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
