import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Metric types supported by SLO definitions.
 */
export enum SloMetricType {
  AVAILABILITY = "availability",
  LATENCY = "latency",
  ERROR_RATE = "error_rate",
}

/**
 * Rolling time windows for SLO evaluation.
 */
export enum SloWindow {
  SEVEN_DAYS = "7d",
  THIRTY_DAYS = "30d",
  NINETY_DAYS = "90d",
}

/**
 * Represents a Service Level Objective that defines a reliability target
 * for a given metric over a rolling time window.
 */
@Entity("slos")
export class Slo {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "api-availability",
    description: "Unique name for the SLO",
  })
  @Column({ unique: true, length: 100 })
  name: string;

  @ApiProperty({
    example: "API gateway must maintain 99.95% availability",
    description: "Human-readable description of the SLO",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    example: 99.95,
    description: "Target percentage for the SLO (0-100)",
  })
  @Column("decimal", { precision: 5, scale: 2 })
  targetPercent: number;

  @ApiProperty({
    enum: SloMetricType,
    example: SloMetricType.AVAILABILITY,
    description: "Type of metric this SLO tracks",
  })
  @Column()
  metricType: SloMetricType;

  @ApiProperty({
    enum: SloWindow,
    example: SloWindow.THIRTY_DAYS,
    description: "Rolling time window for SLO evaluation",
  })
  @Column()
  window: SloWindow;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Optional component UUID this SLO is scoped to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  componentId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this SLO belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({
    example: true,
    description: "Whether the SLO is active",
    default: true,
  })
  @Column({ default: true })
  enabled: boolean;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
