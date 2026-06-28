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
 * Binds a Kubernetes Operator (identified by name + namespace) to a
 * catalog component, establishing traceability between operators
 * and the software components they support.
 */
@Entity("operator_bindings")
@Unique("UQ_operator_binding", [
  "operatorName",
  "operatorNamespace",
  "componentId",
])
export class OperatorBinding {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "prometheus-operator",
    description: "OLM operator name (from CSV metadata.name)",
  })
  @Column()
  operatorName: string;

  @ApiProperty({
    example: "monitoring",
    description: "Kubernetes namespace where the operator is installed",
  })
  @Column()
  operatorNamespace: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Linked catalog component UUID",
  })
  @Index()
  @Column()
  componentId: string;

  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: Component;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "When the binding was created",
  })
  @CreateDateColumn()
  addedAt: Date;

  @Index()
  @Column({ nullable: true })
  organizationId: string;
}
