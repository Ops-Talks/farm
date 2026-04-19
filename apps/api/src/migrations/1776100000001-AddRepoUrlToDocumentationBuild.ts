import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddRepoUrlToDocumentationBuild
 * Adds a nullable repoUrl column to documentation_builds so webhook-triggered
 * builds can store the source repository URL independently of componentId.
 */
export class AddRepoUrlToDocumentationBuild1776100000001
  implements MigrationInterface
{
  name = "AddRepoUrlToDocumentationBuild1776100000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" ADD "repoUrl" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documentation_builds" DROP COLUMN "repoUrl"`,
    );
  }
}
