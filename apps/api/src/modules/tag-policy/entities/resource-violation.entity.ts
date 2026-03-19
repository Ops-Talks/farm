import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

/**
 * Records a tagging violation detected for a cloud or Kubernetes resource.
 * A violation is resolved when the resource is brought into compliance.
 */
@Entity("resource_violations")
@Index(["orgId", "resourceId", "resourceType"])
export class ResourceViolation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Organization this violation belongs to. */
  @Column()
  orgId: string;

  /** Provider-specific resource identifier (e.g. ARN, resource ID). */
  @Column()
  resourceId: string;

  /** Resource type matching the corresponding tag policy (e.g. "ecs-service"). */
  @Column()
  resourceType: string;

  /** Cloud or infrastructure provider of the resource. */
  @Column()
  provider: string;

  /** Tag keys that are absent from the resource but required by policy. */
  @Column("simple-array")
  missingKeys: string[];

  /** Optional reference to the catalog component that owns this resource. */
  @Column({ nullable: true })
  linkedComponentId?: string;

  /** Timestamp when this violation was first detected. */
  @Column({ type: "timestamp" })
  detectedAt: Date;

  /**
   * Timestamp when the violation was resolved (all required keys present).
   * Null when the violation is still active.
   */
  @Column({ type: "timestamp", nullable: true })
  resolvedAt?: Date;
}
