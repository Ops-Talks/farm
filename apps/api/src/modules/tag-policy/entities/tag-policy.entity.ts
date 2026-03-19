import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Represents a tag governance policy that mandates required tag keys for a
 * given resource type within an organization.
 */
@Entity("tag_policies")
export class TagPolicy {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Organization this policy belongs to. */
  @Column()
  orgId: string;

  /**
   * Resource type this policy applies to.
   * Use "*" to match all resource types.
   * Examples: "ecs-service", "k8s-deployment", "*"
   */
  @Column()
  resourceType: string;

  /** List of tag keys that must be present on every matching resource. */
  @Column("simple-array")
  requiredKeys: string[];

  /**
   * Enforcement level.
   * "warning" records a violation but does not block operations.
   * "error" records a hard violation.
   */
  @Column({ default: "warning" })
  severity: "warning" | "error";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
