import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";
import { Environment } from "../../environments/entities/environment.entity";
import { IncidentUpdate } from "./incident-update.entity";
import { IncidentSeverity, IncidentStatus } from "./incident.enums";

// Re-export enums so existing consumers are unaffected.
export { IncidentSeverity, IncidentStatus };

/**
 * Represents a production incident tracked within the Farm platform.
 */
@Entity("incidents")
export class Incident {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "Database connection pool exhaustion",
    description: "Short title summarizing the incident",
  })
  @Column()
  title: string;

  @ApiProperty({
    example: "All PostgreSQL connections are saturated causing 503 errors",
    description: "Detailed description of the incident",
    required: false,
    nullable: true,
  })
  @Column({ type: "text", nullable: true })
  description: string;

  @ApiProperty({
    enum: IncidentSeverity,
    example: IncidentSeverity.P1,
    description: "Priority / severity of the incident",
  })
  @Column({ type: "varchar" })
  severity: IncidentSeverity;

  @ApiProperty({
    enum: IncidentStatus,
    example: IncidentStatus.OPEN,
    description: "Current lifecycle status of the incident",
  })
  @Column({ type: "varchar", default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440099",
    description: "UUID of the user acting as incident commander",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  commanderUserId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this incident belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({
    example: "2024-06-15T14:30:00.000Z",
    description: "Timestamp when the incident was resolved",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  resolvedAt: Date;

  @ApiProperty({
    type: () => [Component],
    description: "Components affected by this incident",
    required: false,
  })
  @ManyToMany(() => Component)
  @JoinTable({
    name: "incident_components",
    joinColumn: { name: "incidents_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "components_id", referencedColumnName: "id" },
  })
  affectedComponents: Component[];

  @ApiProperty({
    type: () => [Environment],
    description: "Environments affected by this incident",
    required: false,
  })
  @ManyToMany(() => Environment)
  @JoinTable({
    name: "incident_environments",
    joinColumn: { name: "incidents_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "environments_id", referencedColumnName: "id" },
  })
  affectedEnvironments: Environment[];

  @ApiProperty({
    type: () => [IncidentUpdate],
    description: "Timeline of updates for this incident",
    required: false,
  })
  @OneToMany(() => IncidentUpdate, (update) => update.incident)
  updates: IncidentUpdate[];

  @ApiProperty({
    example: "2024-06-15T10:00:00.000Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-06-15T10:00:00.000Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
