import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertSimpleArrayToTextArray1780000000002 implements MigrationInterface {
  name = "ConvertSimpleArrayToTextArray1780000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nullableStatements = [
      `ALTER TABLE "users" ALTER COLUMN "roles" TYPE text[] USING CASE WHEN "roles" IS NULL OR "roles" = '' THEN NULL ELSE string_to_array("roles", ',') END`,
      `ALTER TABLE "components" ALTER COLUMN "tags" TYPE text[] USING CASE WHEN "tags" IS NULL OR "tags" = '' THEN NULL ELSE string_to_array("tags", ',') END`,
      `ALTER TABLE "post_mortems" ALTER COLUMN "contributingFactors" TYPE text[] USING CASE WHEN "contributingFactors" IS NULL OR "contributingFactors" = '' THEN NULL ELSE string_to_array("contributingFactors", ',') END`,
      `ALTER TABLE "opa_results" ALTER COLUMN "violations" TYPE text[] USING CASE WHEN "violations" IS NULL OR "violations" = '' THEN NULL ELSE string_to_array("violations", ',') END`,
      `ALTER TABLE "service_templates" ALTER COLUMN "tags" TYPE text[] USING CASE WHEN "tags" IS NULL OR "tags" = '' THEN NULL ELSE string_to_array("tags", ',') END`,
    ];

    for (const statement of nullableStatements) {
      await queryRunner.query(statement);
    }

    const requiredStatements = [
      `ALTER TABLE "tag_policies" ALTER COLUMN "requiredKeys" TYPE text[] USING CASE WHEN "requiredKeys" = '' THEN '{}'::text[] ELSE string_to_array("requiredKeys", ',') END`,
      `ALTER TABLE "resource_violations" ALTER COLUMN "missingKeys" TYPE text[] USING CASE WHEN "missingKeys" = '' THEN '{}'::text[] ELSE string_to_array("missingKeys", ',') END`,
    ];

    for (const statement of requiredStatements) {
      await queryRunner.query(statement);
    }

    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "paths" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "methods" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "tags" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "paths" TYPE text[] USING CASE WHEN "paths" = '' THEN '{}'::text[] ELSE string_to_array("paths", ',') END`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "methods" TYPE text[] USING CASE WHEN "methods" = '' THEN '{}'::text[] ELSE string_to_array("methods", ',') END`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "tags" TYPE text[] USING CASE WHEN "tags" IS NULL OR "tags" = '' THEN NULL ELSE string_to_array("tags", ',') END`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "paths" SET DEFAULT '{}'::text[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "methods" SET DEFAULT '{}'::text[]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "paths" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "methods" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "tags" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "paths" TYPE text USING array_to_string("paths", ',')`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "methods" TYPE text USING array_to_string("methods", ',')`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "tags" TYPE text USING array_to_string("tags", ',')`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "paths" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "methods" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "gateway_routes" ALTER COLUMN "tags" SET DEFAULT ''`,
    );

    const statements = [
      `ALTER TABLE "resource_violations" ALTER COLUMN "missingKeys" TYPE text USING array_to_string("missingKeys", ',')`,
      `ALTER TABLE "tag_policies" ALTER COLUMN "requiredKeys" TYPE text USING array_to_string("requiredKeys", ',')`,
      `ALTER TABLE "service_templates" ALTER COLUMN "tags" TYPE text USING array_to_string("tags", ',')`,
      `ALTER TABLE "opa_results" ALTER COLUMN "violations" TYPE text USING array_to_string("violations", ',')`,
      `ALTER TABLE "post_mortems" ALTER COLUMN "contributingFactors" TYPE text USING array_to_string("contributingFactors", ',')`,
      `ALTER TABLE "components" ALTER COLUMN "tags" TYPE text USING array_to_string("tags", ',')`,
      `ALTER TABLE "users" ALTER COLUMN "roles" TYPE text USING array_to_string("roles", ',')`,
    ];

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }
}
