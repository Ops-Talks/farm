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
 * Records a detected module version drift for an IaC stack.
 * Farm computes how many semver versions behind the in-use module ref is.
 */
@Entity("iac_module_drifts")
export class IacModuleDrift {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "stacks/core-networking/main.tf",
    description:
      "File path (relative to repo root) that contains the outdated module reference",
  })
  @Column()
  stackPath: string;

  @ApiProperty({
    example: "terraform-aws-modules/vpc/aws",
    description: "Name of the Terraform/OpenTofu module",
  })
  @Index()
  @Column()
  moduleName: string;

  @ApiProperty({
    example: "registry.terraform.io/terraform-aws-modules/vpc/aws",
    description: "Source URL of the module registry entry",
  })
  @Column()
  sourceUrl: string;

  @ApiProperty({
    example: "v3.14.0",
    description: "Currently pinned module reference",
  })
  @Column()
  currentRef: string;

  @ApiProperty({
    example: "v3.19.0",
    description: "Latest available module reference",
  })
  @Column()
  latestRef: string;

  @ApiProperty({
    example: 5,
    description:
      "Number of semver patch/minor/major versions behind the latest release",
  })
  @Column({ type: "integer" })
  versionsBehind: number;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp when the drift was first detected",
  })
  @Index()
  @Column()
  detectedAt: Date;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this drift record belongs to",
    nullable: true,
  })
  @Index()
  @Column({ name: "organization_id", type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Record creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Record last-update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
