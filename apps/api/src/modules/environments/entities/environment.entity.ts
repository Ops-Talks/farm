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
 * Represents the type of an environment.
 */
export enum EnvironmentType {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  SANDBOX = "sandbox",
}

/**
 * Represents a deployment environment (e.g., dev, staging, production).
 */
@Entity("environments")
export class Environment {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "production",
    description: "The unique environment name",
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: "Production environment for all services",
    description: "Description of the environment",
    required: false,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    enum: EnvironmentType,
    example: EnvironmentType.PRODUCTION,
    description: "The type of environment",
  })
  @Column({ default: EnvironmentType.DEVELOPMENT })
  type: EnvironmentType;

  @ApiProperty({
    example: 3,
    description: "Display order for sorting environments",
    required: false,
  })
  @Column({ default: 0 })
  order: number;

  @ApiProperty({
    example: { region: "us-east-1", provider: "aws" },
    description: "Additional metadata",
    required: false,
  })
  @Column("simple-json", { nullable: true })
  metadata: Record<string, unknown>;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization this environment belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The creation date",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The last update date",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
