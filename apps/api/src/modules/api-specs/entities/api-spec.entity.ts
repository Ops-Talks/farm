import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";
import { ApiSpecFormat } from "../enums/api-spec-format.enum";
import { ApiSpecStatus } from "../enums/api-spec-status.enum";

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
  @Column({ nullable: true, type: "timestamp" })
  deprecatedAt: Date | null;

  @ApiProperty({
    description: "Timestamp when the spec is scheduled for sunset",
    nullable: true,
  })
  @Column({ nullable: true, type: "timestamp" })
  sunsetAt: Date | null;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;
}
