import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertSimpleJsonToJsonb1780000000001 implements MigrationInterface {
  name = "ConvertSimpleJsonToJsonb1780000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statements = [
      `ALTER TABLE "alerting_rules" ALTER COLUMN "labels" TYPE jsonb USING NULLIF("labels", '')::jsonb`,
      `ALTER TABLE "alerting_rules" ALTER COLUMN "annotations" TYPE jsonb USING NULLIF("annotations", '')::jsonb`,
      `ALTER TABLE "components" ALTER COLUMN "links" TYPE jsonb USING NULLIF("links", '')::jsonb`,
      `ALTER TABLE "components" ALTER COLUMN "metadata" TYPE jsonb USING NULLIF("metadata", '')::jsonb`,
      `ALTER TABLE "components" ALTER COLUMN "containerImage" TYPE jsonb USING NULLIF("containerImage", '')::jsonb`,
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "config" TYPE jsonb USING NULLIF("config", '')::jsonb`,
      `ALTER TABLE "deployments" ALTER COLUMN "metadata" TYPE jsonb USING NULLIF("metadata", '')::jsonb`,
      `ALTER TABLE "environments" ALTER COLUMN "metadata" TYPE jsonb USING NULLIF("metadata", '')::jsonb`,
      `ALTER TABLE "cost_estimates" ALTER COLUMN "breakdown" TYPE jsonb USING NULLIF("breakdown", '')::jsonb`,
      `ALTER TABLE "iac_module_versions" ALTER COLUMN "variablesMeta" TYPE jsonb USING NULLIF("variablesMeta", '')::jsonb`,
      `ALTER TABLE "iac_module_versions" ALTER COLUMN "outputsMeta" TYPE jsonb USING NULLIF("outputsMeta", '')::jsonb`,
      `ALTER TABLE "iac_runs" ALTER COLUMN "resourceChanges" TYPE jsonb USING NULLIF("resourceChanges", '')::jsonb`,
      `ALTER TABLE "post_mortems" ALTER COLUMN "actionItems" TYPE jsonb USING NULLIF("actionItems", '')::jsonb`,
      `ALTER TABLE "organizations" ALTER COLUMN "settings" TYPE jsonb USING NULLIF("settings", '')::jsonb`,
      `ALTER TABLE "pipeline_runs" ALTER COLUMN "stageResults" TYPE jsonb USING NULLIF("stageResults", '')::jsonb`,
      `ALTER TABLE "pipeline_runs" ALTER COLUMN "metadata" TYPE jsonb USING NULLIF("metadata", '')::jsonb`,
      `ALTER TABLE "scorecard_results" ALTER COLUMN "category_scores" TYPE jsonb USING NULLIF("category_scores", '')::jsonb`,
      `ALTER TABLE "scorecard_results" ALTER COLUMN "criteria" TYPE jsonb USING NULLIF("criteria", '')::jsonb`,
      `ALTER TABLE "teams" ALTER COLUMN "metadata" TYPE jsonb USING NULLIF("metadata", '')::jsonb`,
    ];

    for (const statement of statements) {
      await queryRunner.query(statement);
    }

    await queryRunner.query(
      `ALTER TABLE "pipelines" ALTER COLUMN "stages" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" ALTER COLUMN "stages" TYPE jsonb USING COALESCE(NULLIF("stages", ''), '[]')::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" ALTER COLUMN "stages" SET DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipelines" ALTER COLUMN "stages" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" ALTER COLUMN "stages" TYPE text USING "stages"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "pipelines" ALTER COLUMN "stages" SET DEFAULT '[]'`,
    );

    const statements = [
      `ALTER TABLE "teams" ALTER COLUMN "metadata" TYPE text USING "metadata"::text`,
      `ALTER TABLE "scorecard_results" ALTER COLUMN "criteria" TYPE text USING "criteria"::text`,
      `ALTER TABLE "scorecard_results" ALTER COLUMN "category_scores" TYPE text USING "category_scores"::text`,
      `ALTER TABLE "pipeline_runs" ALTER COLUMN "metadata" TYPE text USING "metadata"::text`,
      `ALTER TABLE "pipeline_runs" ALTER COLUMN "stageResults" TYPE text USING "stageResults"::text`,
      `ALTER TABLE "organizations" ALTER COLUMN "settings" TYPE text USING "settings"::text`,
      `ALTER TABLE "post_mortems" ALTER COLUMN "actionItems" TYPE text USING "actionItems"::text`,
      `ALTER TABLE "iac_runs" ALTER COLUMN "resourceChanges" TYPE text USING "resourceChanges"::text`,
      `ALTER TABLE "iac_module_versions" ALTER COLUMN "outputsMeta" TYPE text USING "outputsMeta"::text`,
      `ALTER TABLE "iac_module_versions" ALTER COLUMN "variablesMeta" TYPE text USING "variablesMeta"::text`,
      `ALTER TABLE "cost_estimates" ALTER COLUMN "breakdown" TYPE text USING "breakdown"::text`,
      `ALTER TABLE "environments" ALTER COLUMN "metadata" TYPE text USING "metadata"::text`,
      `ALTER TABLE "deployments" ALTER COLUMN "metadata" TYPE text USING "metadata"::text`,
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "config" TYPE text USING "config"::text`,
      `ALTER TABLE "components" ALTER COLUMN "containerImage" TYPE text USING "containerImage"::text`,
      `ALTER TABLE "components" ALTER COLUMN "metadata" TYPE text USING "metadata"::text`,
      `ALTER TABLE "components" ALTER COLUMN "links" TYPE text USING "links"::text`,
      `ALTER TABLE "alerting_rules" ALTER COLUMN "annotations" TYPE text USING "annotations"::text`,
      `ALTER TABLE "alerting_rules" ALTER COLUMN "labels" TYPE text USING "labels"::text`,
    ];

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }
}
