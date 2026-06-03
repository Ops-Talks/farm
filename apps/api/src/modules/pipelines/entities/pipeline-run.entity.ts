import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { PipelineRunStatus } from "@farm/types";
import { Pipeline } from "./pipeline.entity";

/**
 * Represents the result of a single stage execution within a pipeline run.
 */
export interface StageResult {
  stageId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  output: string | null;
  /** External CI run ID (e.g. GitHub Actions run ID) for correlation. */
  externalRunId?: string | null;
  /** Link to the external CI run. */
  externalRunUrl?: string | null;
}

export { PipelineRunStatus };

/**
 * Records a single execution of a pipeline, including status and log output.
 */
@Entity("pipeline_runs")
export class PipelineRun {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440300",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440200",
    description: "UUID of the pipeline this run belongs to",
  })
  @Index()
  @Column()
  pipelineId: string;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.runs, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "pipelineId" })
  pipeline: Pipeline;

  @ApiProperty({
    enum: PipelineRunStatus,
    example: PipelineRunStatus.QUEUED,
    description: "Current execution status of the run",
  })
  @Column({
    type: "varchar",
    default: PipelineRunStatus.QUEUED,
  })
  status: PipelineRunStatus;

  @ApiProperty({
    example: "user-uuid-1",
    description: "UUID of the user who triggered the run",
  })
  @Column()
  triggeredBy: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this run belongs to",
    nullable: true,
  })
  @Index()
  @Column({ name: "organization_id", type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp when execution started",
    nullable: true,
  })
  @Column({ type: "timestamp", nullable: true })
  startedAt: Date | null;

  @ApiProperty({
    example: "2024-01-01T00:01:30Z",
    description: "Timestamp when execution finished",
    nullable: true,
  })
  @Column({ type: "timestamp", nullable: true })
  finishedAt: Date | null;

  @ApiProperty({
    example: 90000,
    description: "Total run duration in milliseconds",
    nullable: true,
  })
  @Column({ type: "int", nullable: true })
  durationMs: number | null;

  @ApiProperty({
    example: "[INFO] Stage build succeeded\n[INFO] Stage deploy succeeded",
    description: "Accumulated plain-text log output",
    nullable: true,
  })
  @Column({ type: "text", nullable: true })
  logs: string | null;

  @ApiProperty({
    description: "Per-stage execution results stored as JSON",
    type: "array",
    nullable: true,
    items: {
      type: "object",
      properties: {
        stageId: { type: "string" },
        status: {
          type: "string",
          enum: [
            "running",
            "succeeded",
            "failed",
            "waiting_approval",
            "approved",
          ],
        },
        startedAt: { type: "string", format: "date-time", nullable: true },
        finishedAt: { type: "string", format: "date-time", nullable: true },
        output: { type: "string", nullable: true },
        externalRunId: {
          type: "string",
          nullable: true,
          description:
            "External CI run ID for correlation (e.g. GitHub Actions run ID)",
        },
        externalRunUrl: {
          type: "string",
          nullable: true,
          description: "Link to the external CI run",
        },
      },
      required: ["stageId", "status"],
    },
  })
  @Column({ type: "jsonb", nullable: true })
  stageResults: StageResult[] | null;

  @ApiProperty({
    description: "Pipeline stage execution metadata (e.g. infracost result)",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440400",
    description: "UUID of the deployment auto-created by this pipeline run",
    required: false,
    nullable: true,
  })
  @Column({ name: "deployment_id", type: "uuid", nullable: true })
  deploymentId: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "The creation date",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "The last update date",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
