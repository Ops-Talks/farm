import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Persisted result of a single OPA policy evaluation.
 * Records whether the policy allowed the input and any violation messages.
 */
@Entity("opa_results")
export class OpaResult {
  /** Auto-generated UUID primary key */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** References a catalog component UUID (no FK constraint) */
  @Column()
  componentId: string;

  /** OPA policy path evaluated, e.g. "app/rbac/allow" */
  @Column()
  policyPath: string;

  /** Whether the policy allowed the input */
  @Column()
  allowed: boolean;

  /** Optional list of human-readable violation messages */
  @Column("simple-array", { nullable: true })
  violations: string[];

  /** Timestamp when the policy evaluation was performed */
  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  evaluatedAt: Date;

  /** Row creation timestamp managed by TypeORM */
  @CreateDateColumn()
  createdAt: Date;

  /** Row last-update timestamp managed by TypeORM */
  @UpdateDateColumn()
  updatedAt: Date;
}
