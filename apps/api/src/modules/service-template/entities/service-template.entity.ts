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
 * Supported input types for a template variable.
 * Stored as a discriminator to drive frontend rendering logic.
 */
export type TemplateVariableType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "multiselect";

/**
 * Conditional visibility rule for a template variable.
 * When the referenced field equals the given value the action is applied.
 */
export interface TemplateVariableDependsOn {
  field: string;
  equals: string;
  action: "show" | "hide";
}

/**
 * Represents a variable that can be provided when scaffolding
 * a new service from a template.
 * Stored as simple-json — extending this interface requires no DB migration.
 */
export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  default?: string;
  required: boolean;
  pattern?: string;
  // New in Phase 28 (Software Templates 2.0)
  type?: TemplateVariableType;
  /** Valid option values for enum/multiselect types. */
  options?: string[];
  placeholder?: string;
  dependsOn?: TemplateVariableDependsOn;
}

/**
 * Represents a reusable service template that developers can use
 * to scaffold new projects with a predefined structure, language,
 * and framework.
 */
@Entity("service_templates")
export class ServiceTemplate {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "nestjs-api",
    description: "Unique name for the service template",
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: "Production-ready NestJS API template with TypeORM and Swagger",
    description: "Human-readable description of the template",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  description: string | null;

  @ApiProperty({
    example: "typescript",
    description: "Programming language used by the template",
  })
  @Column()
  language: string;

  @ApiProperty({
    example: "nestjs",
    description: "Framework used by the template",
  })
  @Column()
  framework: string;

  @ApiProperty({
    example: ["api", "backend", "microservice"],
    description: "Tags for categorizing the template",
    required: false,
    nullable: true,
  })
  @Column("simple-array", { nullable: true })
  tags: string[] | null;

  @ApiProperty({
    example: "https://github.com/org/nestjs-api-template",
    description: "URL of the repository containing the template source",
  })
  @Column()
  repositoryUrl: string;

  @ApiProperty({
    description: "Template variables that can be provided during scaffolding",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  variables: TemplateVariable[] | null;

  @ApiProperty({
    example: true,
    description:
      "Whether this is a built-in template shipped with the platform",
    default: true,
  })
  @Column({ default: true })
  isBuiltIn: boolean;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this template belongs to",
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
