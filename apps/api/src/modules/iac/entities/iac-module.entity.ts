import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { IacModuleVersion } from "./iac-module-version.entity";

/** Supported cloud and infrastructure providers for IaC modules. */
export enum IacProvider {
  AWS = "aws",
  GCP = "gcp",
  AZURE = "azure",
  KUBERNETES = "kubernetes",
  MONGODB = "mongodb",
  POSTGRES = "postgres",
  MYSQL = "mysql",
  GITHUB = "github",
  CLOUDFLARE = "cloudflare",
  GENERIC = "generic",
}

/** IaC engines (toolchains) that can manage a module. */
export enum IacEngine {
  TERRAFORM = "terraform",
  OPENTOFU = "opentofu",
  PULUMI = "pulumi",
}

/**
 * A Terraform, OpenTofu, or Pulumi module registered in the Farm module
 * catalog. Stores top-level metadata and links to versioned snapshots of
 * the module's variable and output declarations.
 */
@Entity("iac_modules")
export class IacModule {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "terraform-aws-vpc",
    description: "Human-readable module name",
  })
  @Index()
  @Column()
  name: string;

  @ApiProperty({
    enum: IacProvider,
    example: IacProvider.AWS,
    description: "Cloud or infrastructure provider this module targets",
  })
  @Column({ type: "varchar" })
  provider: IacProvider;

  @ApiProperty({
    enum: IacEngine,
    example: IacEngine.TERRAFORM,
    description: "IaC engine used to run this module",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  engine: IacEngine | null;

  @ApiProperty({
    example: "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    description: "Source repository URL used to fetch tags and parse HCL",
  })
  @Column()
  sourceRepoUrl: string;

  @ApiProperty({
    example: "Terraform module for creating a VPC on AWS",
    description: "Short description of what the module provisions",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @ApiProperty({
    example: "v5.1.2",
    description: "Latest known version tag (updated on each sync)",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  latestVersion: string | null;

  @ApiProperty({
    example: "comp-uuid-1234",
    description:
      "Optional FK to a catalog component that owns or uses this module",
    nullable: true,
  })
  @Index()
  @Column({ type: "varchar", nullable: true })
  componentId: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this module belongs to",
    nullable: true,
  })
  @Index()
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @OneToMany(() => IacModuleVersion, (v) => v.module, { cascade: false })
  versions: IacModuleVersion[];

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
