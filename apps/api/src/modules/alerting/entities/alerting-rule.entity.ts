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
 * Severity levels for alerting rules.
 */
export enum AlertingSeverity {
  CRITICAL = "critical",
  WARNING = "warning",
  INFO = "info",
}

/**
 * Represents a PromQL-based alerting rule that can be associated with a
 * component or environment.
 */
@Entity("alerting_rules")
export class AlertingRule {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "high-error-rate",
    description: "Unique name for the alerting rule",
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: "Fires when the HTTP error rate exceeds 5%",
    description: "Human-readable description of the rule",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    example: "sum(rate(http_requests_total[5m])) > 0.05",
    description: "PromQL expression that defines the alert condition",
  })
  @Column("text")
  query: string;

  @ApiProperty({
    example: "5m",
    description: "Duration the condition must be true before the alert fires",
  })
  @Column()
  duration: string;

  @ApiProperty({
    enum: AlertingSeverity,
    example: AlertingSeverity.WARNING,
    description: "Severity level of the alert",
  })
  @Column({
    default: AlertingSeverity.WARNING,
  })
  severity: AlertingSeverity;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Optional component UUID this rule is scoped to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  componentId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Optional environment UUID this rule is scoped to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  environmentId: string;

  @ApiProperty({
    example: { team: "platform", service: "api" },
    description: "Key-value label pairs attached to the alert",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  labels: Record<string, string>;

  @ApiProperty({
    example: { summary: "High error rate detected" },
    description: "Key-value annotation pairs attached to the alert",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  annotations: Record<string, string>;

  @ApiProperty({
    example: true,
    description: "Whether the rule is active",
    default: true,
  })
  @Column({ default: true })
  enabled: boolean;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this rule belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

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
