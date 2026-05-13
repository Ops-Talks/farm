import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";
import { ApiSpecFormat } from "../enums/api-spec-format.enum";
import { ApiSpecStatus } from "../enums/api-spec-status.enum";
import { dateColumnType } from "../../../common/utils/column-type.util";

/**
 * Represents a versioned API specification (OpenAPI or AsyncAPI) associated
 * with a catalog component.
 */
@Entity("api_specs")
export class ApiSpec {
  @ApiProperty({ description: "Unique identifier of the API spec" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "ID of the owning catalog component" })
  @Column()
  componentId: string;

  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "componentId" })
  component: Component;

  @ApiProperty({ description: "Human-readable name of the spec" })
  @Column()
  name: string;

  @ApiProperty({ enum: ApiSpecFormat, description: "Spec format" })
  @Column({ type: "varchar", default: ApiSpecFormat.OPENAPI })
  format: ApiSpecFormat;

  @ApiProperty({ description: "Semantic version of the spec" })
  @Column()
  version: string;

  @ApiProperty({ description: "Raw YAML or JSON spec content" })
  @Column({ type: "text" })
  spec: string;

  @ApiProperty({ enum: ApiSpecStatus, description: "Lifecycle status" })
  @Column({ type: "varchar", default: ApiSpecStatus.ACTIVE })
  status: ApiSpecStatus;

  @ApiProperty({
    description: "Timestamp when the spec was marked deprecated",
    nullable: true,
  })
  @Column({ type: dateColumnType(), nullable: true })
  deprecatedAt: Date | null;

  @ApiProperty({
    description: "Timestamp when the spec is scheduled for sunset",
    nullable: true,
  })
  @Column({ type: dateColumnType(), nullable: true })
  sunsetAt: Date | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization this API spec belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;
}
