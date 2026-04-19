import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a documentation build record tracking the status and artifacts
 * produced when a component's documentation source is compiled.
 */
@Entity("documentation_builds")
export class DocumentationBuild {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Unique identifier for this build record",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The UUID of the component whose documentation was built",
  })
  @Index()
  @Column()
  componentId: string;

  @ApiProperty({
    example: "https://github.com/acme/docs.git",
    description:
      "The remote Git URL used to clone the repository for this build",
    nullable: true,
    required: false,
  })
  @Column({ type: "text", nullable: true })
  repoUrl: string | null;

  @ApiProperty({
    example: "1.2.3",
    description: "The documentation version tag associated with this build",
    default: "unknown",
  })
  @Column({ default: "unknown" })
  version: string;

  @ApiProperty({
    example: "mkdocs",
    description: "The source format used for this build",
    enum: ["mkdocs", "markdown"],
    default: "markdown",
  })
  @Column({
    type: "varchar",
    enum: ["mkdocs", "markdown"],
    default: "markdown",
  })
  sourceType: "mkdocs" | "markdown";

  @ApiProperty({
    example: "ready",
    description: "Current status of the build",
    enum: ["building", "ready", "failed"],
    default: "building",
  })
  @Column({
    type: "varchar",
    enum: ["building", "ready", "failed"],
    default: "building",
  })
  status: "building" | "ready" | "failed";

  @ApiProperty({
    example: "Step 1/3: Cloning repository...",
    description: "Raw build log output",
    nullable: true,
    required: false,
  })
  @Column({ type: "text", nullable: true })
  buildLog: string | null;

  @ApiProperty({
    example: "/artifacts/comp-uuid-1/1.2.3",
    description: "Filesystem path where the build artifacts are stored",
    nullable: true,
    required: false,
  })
  @Column({ type: "text", nullable: true })
  artifactsPath: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp when the build was triggered",
  })
  @CreateDateColumn()
  triggeredAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:01:30Z",
    description: "Timestamp when the build completed (null if still running)",
    nullable: true,
    required: false,
  })
  @Column({ type: "timestamptz", nullable: true })
  completedAt: Date | null;
}
