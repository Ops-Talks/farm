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
 * Status values for an environment request lifecycle.
 */
export enum EnvironmentRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PROVISIONING = "provisioning",
  ACTIVE = "active",
  EXPIRED = "expired",
}

/**
 * Types of environments that can be requested.
 */
export enum EnvironmentType {
  EPHEMERAL = "ephemeral",
  PERSISTENT = "persistent",
}

/**
 * Resource tiers available for environment provisioning.
 */
export enum EnvironmentTier {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}

/**
 * Represents a developer self-service request for a new environment.
 * Tracks the full lifecycle from request through approval, provisioning,
 * and eventual expiration.
 */
@Entity("environment_requests")
export class EnvironmentRequest {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "staging-feature-x",
    description: "Short name for the environment request",
  })
  @Column()
  name: string;

  @ApiProperty({
    example: "Staging environment for feature X integration testing",
    description: "Human-readable description of the request",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  description: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "User ID of the requester",
  })
  @Column()
  requestedBy: string;

  @ApiProperty({
    enum: EnvironmentType,
    example: EnvironmentType.EPHEMERAL,
    description: "Type of environment requested",
  })
  @Column()
  type: EnvironmentType;

  @ApiProperty({
    enum: EnvironmentTier,
    example: EnvironmentTier.SMALL,
    description: "Resource tier for the environment",
  })
  @Column()
  tier: EnvironmentTier;

  @ApiProperty({
    example: 24,
    description: "Time to live in hours before automatic expiration",
    default: 24,
  })
  @Column({ default: 24 })
  ttlHours: number;

  @ApiProperty({
    enum: EnvironmentRequestStatus,
    example: EnvironmentRequestStatus.PENDING,
    description: "Current status of the environment request",
    default: EnvironmentRequestStatus.PENDING,
  })
  @Column({ default: EnvironmentRequestStatus.PENDING })
  status: EnvironmentRequestStatus;

  @ApiProperty({
    example: "Approved for staging use",
    description: "Message from the reviewer or system regarding the status",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  statusMessage: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "User ID of the admin who reviewed the request",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  reviewedBy: string | null;

  @ApiProperty({
    example: "2024-06-15T12:00:00Z",
    description: "Timestamp when the request was reviewed",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "datetime" })
  reviewedAt: Date | null;

  @ApiProperty({
    example: "2024-06-15T12:05:00Z",
    description: "Timestamp when the environment was provisioned",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "datetime" })
  provisionedAt: Date | null;

  @ApiProperty({
    example: "2024-06-16T12:05:00Z",
    description: "Timestamp when the environment expires",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "datetime" })
  expiresAt: Date | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440003",
    description: "Optional component UUID linked to this request",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true, type: "varchar" })
  componentId: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440004",
    description: "Environment record UUID once provisioned",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  environmentId: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this request belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true, type: "varchar" })
  organizationId: string | null;

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
