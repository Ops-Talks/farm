import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents an immutable record of a significant action performed in the system.
 * Audit logs are write-once and should never be updated or deleted.
 */
@Entity("audit_logs")
export class AuditLog {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440099",
    description: "Unique identifier of the audit log entry",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "CREATE",
    description: "The action performed (e.g., CREATE, UPDATE, DELETE)",
  })
  @Column()
  action: string;

  @ApiProperty({
    example: "Component",
    description: "The type of resource affected (e.g., Component, Team, User)",
  })
  @Column()
  resourceType: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The UUID of the affected resource",
  })
  @Column()
  resourceId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "The ID of the user who performed the action, or 'system'",
  })
  @Column()
  actorId: string;

  @ApiProperty({
    example: "jane_doe",
    description:
      "The username of the user who performed the action, or 'system'",
  })
  @Column()
  actorUsername: string;

  @ApiProperty({
    example: { name: "my-service", lifecycle: "production" },
    description: "The changed data associated with the action",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  payload: Record<string, unknown> | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization this audit log entry belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The timestamp when the audit log entry was created",
  })
  @CreateDateColumn()
  createdAt: Date;
}
