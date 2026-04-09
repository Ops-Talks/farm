import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";

/**
 * Binds a Flux resource (Kustomization or HelmRelease) to a catalog component,
 * establishing traceability between GitOps deployments and the software
 * components they deliver.
 */
@Entity("flux_bindings")
@Unique("UQ_flux_binding", [
  "resourceKind",
  "resourceName",
  "resourceNamespace",
  "componentId",
])
export class FluxBinding {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    enum: ["Kustomization", "HelmRelease"],
    description: "Flux resource kind",
  })
  @Column({ type: "varchar" })
  resourceKind: "Kustomization" | "HelmRelease";

  @ApiProperty({
    example: "my-app",
    description: "Flux resource name",
  })
  @Column()
  resourceName: string;

  @ApiProperty({
    example: "flux-system",
    description: "Kubernetes namespace of the Flux resource",
  })
  @Column()
  resourceNamespace: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Linked catalog component UUID",
  })
  @Index()
  @Column()
  componentId: string;

  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "componentId" })
  component: Component;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "When the binding was created",
  })
  @CreateDateColumn()
  boundAt: Date;

  @ApiProperty({
    required: false,
    description: "Organization UUID that owns this binding",
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;
}
