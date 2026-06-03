import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Records a tagging violation detected for a cloud or Kubernetes resource.
 * A violation is resolved when the resource is brought into compliance.
 */
@Entity("resource_violations")
@Index(["orgId", "resourceId", "resourceType"])
export class ResourceViolation {
  @ApiProperty({ description: "Auto-generated UUID primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Organization this violation belongs to. */
  @ApiProperty({ description: "Organization UUID this violation belongs to" })
  @Column()
  orgId: string;

  /** Provider-specific resource identifier (e.g. ARN, resource ID). */
  @ApiProperty({
    description:
      "Provider-specific resource identifier (e.g. ARN, resource ID)",
    example: "arn:aws:ecs:us-east-1:123456789012:service/my-cluster/my-service",
  })
  @Column()
  resourceId: string;

  /** Resource type matching the corresponding tag policy (e.g. "ecs-service"). */
  @ApiProperty({
    description: "Resource type matching the tag policy",
    example: "ecs-service",
  })
  @Column()
  resourceType: string;

  /** Cloud or infrastructure provider of the resource. */
  @ApiProperty({
    description: "Cloud or infrastructure provider",
    example: "aws",
  })
  @Column()
  provider: string;

  /** Tag keys that are absent from the resource but required by policy. */
  @ApiProperty({
    description: "Tag keys absent from the resource but required by policy",
    type: [String],
  })
  @Column({ type: "text", array: true })
  missingKeys: string[];

  /** Optional reference to the catalog component that owns this resource. */
  @ApiProperty({
    description: "Catalog component UUID that owns this resource",
    nullable: true,
    required: false,
  })
  @Column({ nullable: true })
  linkedComponentId?: string;

  /** Timestamp when this violation was first detected. */
  @ApiProperty({
    description: "Timestamp when this violation was first detected",
  })
  @Column({ type: "timestamp" })
  detectedAt: Date;

  /**
   * Timestamp when the violation was resolved (all required keys present).
   * Null when the violation is still active.
   */
  @ApiProperty({
    description:
      "Timestamp when the violation was resolved; null if still active",
    nullable: true,
    required: false,
  })
  @Column({ type: "timestamp", nullable: true })
  resolvedAt?: Date;
}
