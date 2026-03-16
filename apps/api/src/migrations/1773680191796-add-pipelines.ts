import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPipelines1773680191796 implements MigrationInterface {
  name = "AddPipelines1773680191796";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pipelines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "stages" text NOT NULL DEFAULT '[]',
        "organizationId" character varying,
        "createdBy" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pipelines_name" UNIQUE ("name"),
        CONSTRAINT "PK_pipelines" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_pipelines_organizationId" ON "pipelines" ("organizationId")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."pipeline_runs_status_enum" AS ENUM(
        'queued', 'running', 'succeeded', 'failed', 'cancelled'
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "pipeline_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pipelineId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'queued',
        "triggeredBy" character varying NOT NULL,
        "startedAt" TIMESTAMP,
        "finishedAt" TIMESTAMP,
        "durationMs" integer,
        "logs" text,
        "stageResults" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pipeline_runs" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_pipeline_runs_pipelineId" ON "pipeline_runs" ("pipelineId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "pipeline_runs"
        ADD CONSTRAINT "FK_pipeline_runs_pipelineId"
        FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pipeline_runs" DROP CONSTRAINT "FK_pipeline_runs_pipelineId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_pipeline_runs_pipelineId"`,
    );
    await queryRunner.query(`DROP TABLE "pipeline_runs"`);
    await queryRunner.query(`DROP TYPE "public"."pipeline_runs_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_pipelines_organizationId"`,
    );
    await queryRunner.query(`DROP TABLE "pipelines"`);
  }
}
