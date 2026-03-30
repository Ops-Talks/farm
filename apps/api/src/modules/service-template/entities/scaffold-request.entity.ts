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
 * Status lifecycle for a scaffold request.
 */
export enum ScaffoldRequestStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Represents a request to scaffold a new service from a template.
 * Tracks the status, variables, and result of the scaffolding process.
 */
@Entity("scaffold_requests")
export class ScaffoldRequest {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID of the template used for scaffolding",
  })
  @Index()
  @Column()
  templateId: string;

  @ApiProperty({
    example: "nestjs-api",
    description: "Name of the template (denormalized for convenience)",
  })
  @Column()
  templateName: string;

  @ApiProperty({
    example: "org/new-service-name",
    description: "Target repository path for the scaffolded service",
  })
  @Column()
  targetRepository: string;

  @ApiProperty({
    example: { SERVICE_NAME: "my-service", PORT: "3000" },
    description: "Key-value pairs of variables provided by the user",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  variables: Record<string, string> | null;

  @ApiProperty({
    enum: ScaffoldRequestStatus,
    example: ScaffoldRequestStatus.PENDING,
    description: "Current status of the scaffold request",
  })
  @Column({ default: ScaffoldRequestStatus.PENDING })
  status: ScaffoldRequestStatus;

  @ApiProperty({
    example: "Repository created successfully",
    description: "Status message with details about the result or error",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  statusMessage: string | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "UUID of the user who requested the scaffold",
  })
  @Column()
  requestedBy: string;

  @ApiProperty({
    example: false,
    description: "Whether this is a dry-run request (preview only)",
    default: false,
  })
  @Column({ default: false })
  dryRun: boolean;

  @ApiProperty({
    example: ["README.md", "package.json", "src/main.ts", "src/app.module.ts"],
    description:
      "Preview of rendered file tree (populated for dry-run requests)",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  renderedFiles: string[] | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this request belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true, type: "varchar" })
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
