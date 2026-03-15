import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AddMissingIndexes1773084586800 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      "components",
      new TableIndex({
        name: "IDX_components_owner",
        columnNames: ["owner"],
      }),
    );

    await queryRunner.createIndex(
      "documentation",
      new TableIndex({
        name: "IDX_documentation_componentId",
        columnNames: ["componentId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "documentation",
      "IDX_documentation_componentId",
    );
    await queryRunner.dropIndex("components", "IDX_components_owner");
  }
}
