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
 * Represents a single infrastructure resource belonging to an IaC stack.
 * Populated by Cultivator via the resource ingest endpoint.
 * No attribute values or secrets are stored — only the resource topology.
 */
@Entity("iac_resources")
export class IacResource {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
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
    description: "Full Terraform/OpenTofu resource address",
  })
  @Column()
  address: string;

  @ApiProperty({
    example: "aws_instance",
    description: "Terraform/OpenTofu resource type",
  })
  @Column()
  resourceType: string;

  @ApiProperty({
    example: "web",
    description: "Resource logical name within the module",
  })
  @Column()
  resourceName: string;

  @ApiProperty({
    example: "aws",
    description: "Cloud or infrastructure provider",
  })
  @Column()
  provider: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this resource belongs to",
    nullable: true,
  })
  @Index()
  @Column({ type: "uuid", nullable: true })
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
