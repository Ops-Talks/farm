import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { dateColumnType } from "../../../common/utils/column-type.util";

/**
 * Persisted result of a single OPA policy evaluation.
 * Records whether the policy allowed the input and any violation messages.
 */
@Entity("opa_results")
export class OpaResult {
  /** Auto-generated UUID primary key */
  @ApiProperty({ description: "Auto-generated UUID primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** References a catalog component UUID (no FK constraint) */
  @ApiProperty({ description: "Catalog component UUID this result belongs to" })
  @Column()
  componentId: string;

  /** OPA policy path evaluated, e.g. "app/rbac/allow" */
  @ApiProperty({
    description: 'OPA policy path evaluated, e.g. "app/rbac/allow"',
    example: "app/rbac/allow",
  })
  @Column()
  policyPath: string;

  /** Whether the policy allowed the input */
  @ApiProperty({ description: "Whether the policy allowed the input" })
  @Column()
  allowed: boolean;

  /** Optional list of human-readable violation messages */
  @ApiProperty({
    description: "Human-readable violation messages (empty when allowed)",
    type: [String],
    nullable: true,
  })
  @Column("simple-array", { nullable: true })
  violations: string[];

  /** Timestamp when the policy evaluation was performed */
  @ApiProperty({
    description: "Timestamp when the policy evaluation was performed",
  })
  @Column({ type: dateColumnType(), default: () => "CURRENT_TIMESTAMP" })
  evaluatedAt: Date;

  /** Row creation timestamp managed by TypeORM */
  @ApiProperty({ description: "Row creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  /** Row last-update timestamp managed by TypeORM */
  @ApiProperty({ description: "Row last-update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;
}
