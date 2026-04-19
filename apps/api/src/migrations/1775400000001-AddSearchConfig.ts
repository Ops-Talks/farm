import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

/**
 * Creates the search_configs table used to store per-organization (or global)
 * boost weights and fuzziness settings for Elasticsearch advanced search.
 */
export class AddSearchConfig1775400000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "search_configs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "organizationId",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "titleBoost",
            type: "float8",
            default: 3,
          },
          {
            name: "tagsBoost",
            type: "float8",
            default: 2,
          },
          {
            name: "descriptionBoost",
            type: "float8",
            default: 1,
          },
          {
            name: "fuzziness",
            type: "varchar",
            default: "'AUTO'",
          },
          {
            name: "createdAt",
            type: "TIMESTAMP",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "TIMESTAMP",
            default: "now()",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "search_configs",
      new TableIndex({
        name: "IDX_search_configs_organizationId",
        columnNames: ["organizationId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("search_configs");
  }
}
