import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { PipelineRun } from "./pipeline-run.entity";
import { Component } from "../../catalog/entities/component.entity";

/**
 * Configuration for delegating a stage to an external CI/CD backend.
 */
export interface ExternalCIBackend {
  /** The CI/CD provider that will execute this stage. */
  provider: "github-actions" | "argocd" | "jenkins" | "circleci";
  /** Git ref (branch, tag, SHA) for workflow_dispatch. */
  ref?: string;
  /** GitHub Actions workflow file name or ID (e.g. "deploy.yml"). */
  workflowId?: string;
  /** ArgoCD application name to sync. */
  appName?: string;
  /** Jenkins job name. */
  jobName?: string;
  /** CircleCI pipeline slug. */
  pipelineSlug?: string;
  /**
   * For deploy stages: the componentId and environmentId to use when
   * auto-creating a Deployment record on success.
   */
  componentId?: string;
  environmentId?: string;
}

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
  /** Optional external CI/CD backend for this stage. */
  backend?: ExternalCIBackend;
}

/**
 * Represents a pipeline definition containing an ordered list of stages.
 */
@Entity("pipelines")
@Index(["name", "organizationId"], { unique: true })
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
  @Column()
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
    items: {
      type: "object",
      properties: {
        id: { type: "string", description: "Stage UUID or short ID" },
        name: { type: "string", description: "Human-readable stage name" },
        type: {
          type: "string",
          enum: [
            "script",
            "approval",
            "deploy",
            "notify",
            "build",
            "infracost",
          ],
          description: "Stage category",
        },
        config: {
          type: "object",
          additionalProperties: true,
          description: "Stage-specific configuration values",
        },
        order: {
          type: "number",
          description: "Execution order — lower numbers run first",
        },
        backend: {
          type: "object",
          nullable: true,
          description:
            "Optional external CI/CD backend to delegate this stage to",
          properties: {
            provider: {
              type: "string",
              enum: ["github-actions", "argocd", "jenkins", "circleci"],
            },
            ref: { type: "string", nullable: true },
            workflowId: { type: "string", nullable: true },
            appName: { type: "string", nullable: true },
            jobName: { type: "string", nullable: true },
            pipelineSlug: { type: "string", nullable: true },
            componentId: { type: "string", nullable: true },
            environmentId: { type: "string", nullable: true },
          },
        },
      },
      required: ["id", "name", "type", "config", "order"],
    },
  })
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
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

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Optional component UUID this pipeline is bound to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ name: "component_id", type: "uuid", nullable: true })
  componentId: string | null;

  @ManyToOne(() => Component, {
    onDelete: "SET NULL",
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: "component_id" })
  component: Component | null;

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
