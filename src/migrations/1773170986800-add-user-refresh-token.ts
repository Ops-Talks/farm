import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUserRefreshToken1773170986800 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "refreshToken",
        type: "character varying",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "refreshToken");
  }
}
