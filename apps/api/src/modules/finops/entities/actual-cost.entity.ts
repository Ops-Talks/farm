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
 * Stores an actual cost measurement retrieved from OpenCost for a catalog component.
 * Multiple records per component (one per sync cycle).
 */
@Entity("actual_costs")
export class ActualCost {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440500",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID of the component this cost record belongs to",
  })
  @Index()
  @Column()
  componentId: string;

  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "componentId" })
  component: Component;

  @ApiProperty({
    example: "30d",
    description: "Time window for the cost aggregation (e.g. 7d, 30d)",
  })
  @Column({ default: "30d" })
  window: string;

  @ApiProperty({ example: 0.5, description: "CPU cost in the given window" })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  cpuCost: number;

  @ApiProperty({
    example: 0.25,
    description: "Memory cost in the given window",
  })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  memoryCost: number;

  @ApiProperty({
    example: 0.1,
    description: "Persistent volume cost in the given window",
  })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  pvCost: number;

  @ApiProperty({
    example: 0.05,
    description: "Network cost in the given window",
  })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  networkCost: number;

  @ApiProperty({
    example: 0.9,
    description: "Total cost (sum of all cost dimensions) in the given window",
  })
  @Column({
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  totalCost: number;

  @ApiProperty({
    example: "USD",
    description: "Currency code for cost values",
  })
  @Column({ default: "USD" })
  currency: string;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp at which this cost record was synced from OpenCost",
  })
  @Column()
  syncedAt: Date;

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
