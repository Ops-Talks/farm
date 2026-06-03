import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a tag governance policy that mandates required tag keys for a
 * given resource type within an organization.
 */
@Entity("tag_policies")
export class TagPolicy {
  @ApiProperty({ description: "Auto-generated UUID primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Organization this policy belongs to. */
  @ApiProperty({ description: "Organization UUID this policy applies to" })
  @Column()
  orgId: string;

  /**
   * Resource type this policy applies to.
   * Use "*" to match all resource types.
   * Examples: "ecs-service", "k8s-deployment", "*"
   */
  @ApiProperty({
    description: 'Resource type filter; use "*" to match all types',
    example: "ecs-service",
  })
  @Column()
  resourceType: string;

  /** List of tag keys that must be present on every matching resource. */
  @ApiProperty({
    description: "Tag keys that must be present on every matching resource",
    type: [String],
  })
  @Column({ type: "text", array: true })
  requiredKeys: string[];

  /**
   * Enforcement level.
   * "warning" records a violation but does not block operations.
   * "error" records a hard violation.
   */
  @ApiProperty({
    description:
      'Enforcement level: "warning" (non-blocking) or "error" (hard violation)',
    enum: ["warning", "error"],
    default: "warning",
  })
  @Column({ default: "warning" })
  severity: "warning" | "error";

  @ApiProperty({ description: "Row creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Row last-update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;
}
