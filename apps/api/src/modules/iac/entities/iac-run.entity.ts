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
import { IacStack } from "./iac-stack.entity";

/**
 * Allowed run types for an IaC operation.
 */
export enum IacRunType {
  PLAN = "plan",
  APPLY = "apply",
}

/**
 * Possible terminal states for an IaC run.
 */
export enum IacRunStatus {
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Resource change summary produced by a Terraform/OpenTofu plan or apply.
 */
export interface ResourceChanges {
  add: number;
  change: number;
  destroy: number;
}

/**
 * Records a single plan or apply execution for an IacStack.
 */
@Entity("iac_runs")
export class IacRun {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID of the parent IacStack",
  })
  @Index()
  @Column()
  stackId: string;

  @ManyToOne(() => IacStack, (stack) => stack.runs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stack_id" })
  stack: IacStack;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this run belongs to",
    nullable: true,
  })
  @Index()
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    enum: IacRunType,
    example: IacRunType.PLAN,
    description: "Whether this run was a plan or apply operation",
  })
  @Column({ type: "simple-enum", enum: IacRunType })
  type: IacRunType;

  @ApiProperty({
    enum: IacRunStatus,
    example: IacRunStatus.SUCCEEDED,
    description: "Terminal status of the run",
  })
  @Column({ type: "simple-enum", enum: IacRunStatus })
  status: IacRunStatus;

  @ApiProperty({
    example: "production",
    description: "Target environment for this run",
  })
  @Index()
  @Column()
  environment: string;

  @ApiProperty({
    example: "terraform",
    description: "IaC provider used for this run",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  provider: string | null;

  @ApiProperty({
    description: "Summary of resource changes (add/change/destroy)",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  resourceChanges: ResourceChanges | null;

  @ApiProperty({
    example: "github-actions-bot",
    description: "Actor username or CI system that triggered the run",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  triggeredBy: string | null;

  @ApiProperty({
    example: "https://github.com/acme/infra/actions/runs/12345",
    description: "Link to the CI pipeline that executed this run",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  pipelineUrl: string | null;

  @ApiProperty({
    example: "2024-01-01T10:00:00Z",
    description: "Timestamp when the run started",
    nullable: true,
  })
  @Column({ type: "timestamp", nullable: true })
  startedAt: Date | null;

  @ApiProperty({
    example: "2024-01-01T10:03:45Z",
    description: "Timestamp when the run finished",
    nullable: true,
  })
  @Column({ type: "timestamp", nullable: true })
  finishedAt: Date | null;

  @ApiProperty({
    example: 225000,
    description: "Total run duration in milliseconds",
    nullable: true,
  })
  @Column({ nullable: true, type: "integer" })
  durationMs: number | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Record creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Record last-update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
