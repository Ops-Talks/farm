import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Incident } from "./incident.entity";
import { IncidentStatus } from "./incident.enums";

/**
 * Represents a single timeline entry for an incident.
 * Created automatically on status transitions or manually by responders.
 */
@Entity("incident_updates")
export class IncidentUpdate {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID of the parent incident",
  })
  @Index()
  @Column()
  incidentId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440099",
    description: "UUID of the user who authored this update",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  authorId: string;

  @ApiProperty({
    example: "Identified root cause as connection pool misconfiguration",
    description: "Free-text message describing the update",
  })
  @Column({ type: "text" })
  message: string;

  @ApiProperty({
    enum: IncidentStatus,
    example: IncidentStatus.OPEN,
    description: "Status before this update (null for manual timeline entries)",
    required: false,
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  previousStatus: IncidentStatus;

  @ApiProperty({
    enum: IncidentStatus,
    example: IncidentStatus.INVESTIGATING,
    description: "Status after this update (null for manual timeline entries)",
    required: false,
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  newStatus: IncidentStatus;

  @ManyToOne(() => Incident, (incident) => incident.updates, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "incident_id" })
  incident: Incident;

  @ApiProperty({
    example: "2024-06-15T10:05:00.000Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;
}
