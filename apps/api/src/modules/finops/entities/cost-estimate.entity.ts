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
import { Component } from "../../catalog/entities/component.entity";
import { numericTransformer } from "../../../common/transformers/numeric.transformer";

/**
 * Stores the latest infracost estimate for a catalog component.
 * One record per component (upserted on each pipeline run).
 */
@Entity("cost_estimates")
export class CostEstimate {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440400",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this estimate belongs to",
    nullable: true,
  })
  @Index()
  @Column({ name: "organization_id", type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID of the component this estimate belongs to",
  })
  @Index()
  @Column()
  componentId: string;

  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "componentId" })
  component: Component;

  @ApiProperty({
    example: "pipeline-run-uuid-1",
    description: "UUID of the pipeline run that produced this estimate",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  pipelineRunId: string | null;

  @ApiProperty({
    example: 12.5,
    description: "Estimated total monthly cost in the given currency",
  })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  estimatedMonthlyCost: number;

  @ApiProperty({
    example: "USD",
    description: "Currency code for cost values",
  })
  @Column({ default: "USD" })
  currency: string;

  @ApiProperty({
    example: 2.5,
    description: "Diff (delta) monthly cost compared to previous estimate",
  })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  diffMonthlyCost: number;

  @ApiProperty({
    description: "Detailed cost breakdown from infracost (JSON)",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  breakdown: Record<string, unknown> | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp at which the measurement was taken",
  })
  @Column()
  measuredAt: Date;

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
