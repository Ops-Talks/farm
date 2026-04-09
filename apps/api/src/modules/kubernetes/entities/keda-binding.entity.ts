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
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";

/**
 * Binds a KEDA ScaledObject (identified by name + namespace) to a
 * catalog component, establishing traceability between autoscaling
 * configurations and the software components they govern.
 */
@Entity("keda_bindings")
@Unique("UQ_keda_binding", [
  "scaledObjectName",
  "scaledObjectNamespace",
  "componentId",
])
export class KedaBinding {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "my-app-scaler",
    description: "KEDA ScaledObject name",
  })
  @Column()
  scaledObjectName: string;

  @ApiProperty({
    example: "production",
    description: "Kubernetes namespace of the ScaledObject",
  })
  @Column()
  scaledObjectNamespace: string;

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

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Organization UUID (optional scope)",
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;
}
