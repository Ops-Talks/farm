import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1772738986800 implements MigrationInterface {
  name = "Initial1772738986800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "documentation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "sourceUrl" text NOT NULL, "componentId" character varying NOT NULL, "author" character varying NOT NULL, "version" character varying NOT NULL DEFAULT '1.0.0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5bd6f5f1b06e11515e4174b020f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "components" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "kind" character varying NOT NULL DEFAULT 'service', "description" character varying, "owner" character varying NOT NULL, "lifecycle" character varying NOT NULL DEFAULT 'experimental', "tags" text, "links" text, "metadata" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_673dc1c412adfb5b54ec419224e" UNIQUE ("name"), CONSTRAINT "PK_0d742661c63926321b5f5eac1ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "email" character varying NOT NULL, "displayName" character varying NOT NULL, "password" character varying NOT NULL, "roles" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "component_dependencies" ("component_id" uuid NOT NULL, "dependency_id" uuid NOT NULL, CONSTRAINT "PK_be7d8a9df80207f1815bfed5e90" PRIMARY KEY ("component_id", "dependency_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e033e8d8e71c7e9e1109e1f1e0" ON "component_dependencies" ("component_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a39f7059bbe7a67f3c8a43dd1" ON "component_dependencies" ("dependency_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "component_dependencies" ADD CONSTRAINT "FK_e033e8d8e71c7e9e1109e1f1e0c" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_dependencies" ADD CONSTRAINT "FK_6a39f7059bbe7a67f3c8a43dd1d" FOREIGN KEY ("dependency_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "component_dependencies" DROP CONSTRAINT "FK_6a39f7059bbe7a67f3c8a43dd1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "component_dependencies" DROP CONSTRAINT "FK_e033e8d8e71c7e9e1109e1f1e0c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6a39f7059bbe7a67f3c8a43dd1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e033e8d8e71c7e9e1109e1f1e0"`,
    );
    await queryRunner.query(`DROP TABLE "component_dependencies"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "components"`);
    await queryRunner.query(`DROP TABLE "documentation"`);
  }
}
