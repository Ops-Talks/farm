import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";
import { Environment } from "./environment.entity";

/**
 * Represents the status of a deployment.
 */
export enum DeploymentStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  ROLLED_BACK = "rolled_back",
}

/**
 * Valid deployment status transitions.
 */
export const DEPLOYMENT_STATUS_TRANSITIONS: Record<
  DeploymentStatus,
  DeploymentStatus[]
> = {
  [DeploymentStatus.PENDING]: [
    DeploymentStatus.IN_PROGRESS,
    DeploymentStatus.FAILED,
  ],
  [DeploymentStatus.IN_PROGRESS]: [
    DeploymentStatus.SUCCEEDED,
    DeploymentStatus.FAILED,
  ],
  [DeploymentStatus.SUCCEEDED]: [DeploymentStatus.ROLLED_BACK],
  [DeploymentStatus.FAILED]: [DeploymentStatus.PENDING],
  [DeploymentStatus.ROLLED_BACK]: [DeploymentStatus.PENDING],
};

/**
 * Represents a deployment of a component to an environment.
 */
@Entity("deployments")
export class Deployment {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440020",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "v2.3.1",
    description: "The version being deployed",
  })
  @Column()
  version: string;

  @ApiProperty({
    enum: DeploymentStatus,
    example: DeploymentStatus.SUCCEEDED,
    description: "Current deployment status",
  })
  @Column({ default: DeploymentStatus.PENDING })
  status: DeploymentStatus;

  @ApiProperty({
    example: "ci-bot",
    description: "Username or system that triggered the deployment",
    required: false,
  })
  @Column({ nullable: true })
  deployedBy: string;

  @ApiProperty({
    example: "a1b2c3d4e5f6",
    description: "Git commit SHA associated with this deployment",
    required: false,
  })
  @Column({ nullable: true })
  commitSha: string;

  @ApiProperty({
    example: "Hotfix for login timeout issue",
    description: "Description or notes about the deployment",
    required: false,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    example: { pipelineUrl: "https://ci.example.com/runs/123" },
    description: "Additional metadata",
    required: false,
  })
  @Column("simple-json", { nullable: true })
  metadata: Record<string, unknown>;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The ID of the deployed component",
  })
  @Column()
  componentId: string;

  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "componentId" })
  component: Component;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "The ID of the target environment",
  })
  @Column()
  environmentId: string;

  @ManyToOne(() => Environment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "environmentId" })
  environment: Environment;

  @ApiProperty({
    example: "2023-06-15T10:30:00Z",
    description: "When the deployment started",
  })
  @Column({ type: "datetime", nullable: true })
  startedAt: Date;

  @ApiProperty({
    example: "2023-06-15T10:35:00Z",
    description: "When the deployment finished",
    required: false,
  })
  @Column({ type: "datetime", nullable: true })
  finishedAt: Date;

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
