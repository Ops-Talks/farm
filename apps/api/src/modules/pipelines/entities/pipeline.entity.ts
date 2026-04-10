import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { PipelineRun } from "./pipeline-run.entity";

/**
 * Represents a single stage within a pipeline definition.
 */
export interface PipelineStage {
  /** UUID or short ID for the stage */
  id: string;
  /** Human-readable stage name */
  name: string;
  /** Category that determines how the stage is executed */
  type: "script" | "approval" | "deploy" | "notify" | "build" | "infracost";
  /** Stage-specific configuration values */
  config: Record<string, unknown>;
  /** Execution order — lower numbers run first */
  order: number;
}

/**
 * Represents a pipeline definition containing an ordered list of stages.
 */
@Entity("pipelines")
export class Pipeline {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440200",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "deploy-to-production",
    description: "Unique pipeline name",
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: "Deploys the main service to production after approval",
    description: "Human-readable pipeline description",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    description: "Ordered list of pipeline stages stored as JSON",
    type: "array",
    items: { type: "object" },
  })
  @Column("simple-json", { default: "[]" })
  stages: PipelineStage[];

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Optional organization UUID for multi-tenant scoping",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({
    example: "user-uuid-1",
    description: "UUID of the user who created the pipeline",
  })
  @Column()
  createdBy: string;

  @OneToMany(() => PipelineRun, (run) => run.pipeline)
  runs: PipelineRun[];

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
