import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentationTreeFields1772998186800 implements MigrationInterface {
  name = "AddDocumentationTreeFields1772998186800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documentation" ADD COLUMN "parentId" VARCHAR NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentation" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documentation_parentId" ON "documentation" ("parentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documentation_componentId_order" ON "documentation" ("componentId", "order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_documentation_componentId_order"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_documentation_parentId"`,
    );
    await queryRunner.query(`ALTER TABLE "documentation" DROP COLUMN "order"`);
    await queryRunner.query(
      `ALTER TABLE "documentation" DROP COLUMN "parentId"`,
    );
  }
}
