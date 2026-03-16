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
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp when execution started",
    nullable: true,
  })
  @Column({ type: "datetime", nullable: true })
  startedAt: Date | null;

  @ApiProperty({
    example: "2024-01-01T00:01:30Z",
    description: "Timestamp when execution finished",
    nullable: true,
  })
  @Column({ type: "datetime", nullable: true })
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
    items: { type: "object" },
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  stageResults: StageResult[] | null;

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
