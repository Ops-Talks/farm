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
import { GatewayType } from "../enums/gateway-type.enum";

/**
 * Represents a route entry synchronized from an API gateway (Kong or AWS API Gateway).
 */
@Entity("gateway_routes")
export class GatewayRoute {
  @ApiProperty({ description: "Unique identifier of the gateway route" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "External identifier from the gateway provider" })
  @Column()
  externalId: string;

  @ApiProperty({ description: "Human-readable route name" })
  @Column()
  name: string;

  @ApiProperty({
    description: "URL paths matched by this route",
    type: [String],
  })
  @Column({ type: "text", array: true, default: () => "'{}'" })
  paths: string[];

  @ApiProperty({
    description: "HTTP methods matched by this route",
    type: [String],
  })
  @Column({ type: "text", array: true, default: () => "'{}'" })
  methods: string[];

  @ApiProperty({
    description: "Tags associated with this route",
    type: [String],
    nullable: true,
  })
  @Column({ type: "text", array: true, nullable: true })
  tags: string[];

  @ApiProperty({ enum: GatewayType, description: "Gateway provider type" })
  @Column({ type: "varchar" })
  gatewayType: GatewayType;

  @ApiProperty({
    description: "Associated catalog component ID",
    nullable: true,
  })
  @Column({ type: "uuid", nullable: true })
  componentId: string | null;

  @ManyToOne(() => Component, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "componentId" })
  component: Component | null;

  @ApiProperty({
    description: "Timestamp of last successful sync",
    nullable: true,
  })
  @Column({ type: "timestamp", nullable: true })
  syncedAt: Date | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization this gateway route belongs to",
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
