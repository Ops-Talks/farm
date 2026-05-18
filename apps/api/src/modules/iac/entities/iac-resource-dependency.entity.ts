import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a directed dependency edge between two IaC resources in the same
 * stack. Populated by Cultivator via the resource ingest endpoint.
 */
@Entity("iac_resource_dependencies")
export class IacResourceDependency {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440020",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID of the parent IacStack (soft FK, no TypeORM relation)",
  })
  @Index()
  @Column({ type: "varchar" })
  stackId: string;

  @ApiProperty({
    example: "aws_instance.web",
    description: "Resource address that depends on the target",
  })
  @Column()
  sourceAddress: string;

  @ApiProperty({
    example: "aws_security_group.web",
    description: "Resource address that the source depends on",
  })
  @Column()
  targetAddress: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this dependency record belongs to",
    nullable: true,
  })
  @Index()
  @Column({ name: "organization_id", type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;
}
