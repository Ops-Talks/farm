import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Incident } from "./incident.entity";

/**
 * Represents a single action item within a post-mortem.
 */
export interface PostMortemActionItem {
  title: string;
  assignee?: string;
  done: boolean;
}

/**
 * Represents a post-mortem analysis linked to a resolved incident.
 * Each incident may have at most one post-mortem (1:1 relationship).
 */
@Entity("post_mortems")
export class PostMortem {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID of the related incident (unique, 1:1)",
  })
  @Column({ unique: true })
  incidentId: string;

  @ApiProperty({
    example: "Connection pool max size was set to 5 instead of 50",
    description: "Root cause analysis",
  })
  @Column({ type: "text" })
  rootCause: string;

  @ApiProperty({
    example: ["Missing connection pool monitoring", "No autoscaling"],
    description: "Factors that contributed to the incident",
    required: false,
    nullable: true,
  })
  @Column("simple-array", { nullable: true })
  contributingFactors: string[];

  @ApiProperty({
    example: [
      { title: "Add connection pool alerts", assignee: "john", done: false },
    ],
    description: "List of follow-up action items",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  actionItems: PostMortemActionItem[];

  @ApiProperty({
    example: "## Summary\nFull post-mortem write-up in Markdown...",
    description: "Full post-mortem body in Markdown format",
    required: false,
    nullable: true,
  })
  @Column({ type: "text", nullable: true })
  body: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440099",
    description: "UUID of the user who approved the post-mortem",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  approvedBy: string;

  @ApiProperty({
    example: "2024-06-20T09:00:00.000Z",
    description: "Timestamp when the post-mortem was approved",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  approvedAt: Date;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this post-mortem belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @OneToOne(() => Incident)
  @JoinColumn({ name: "incidentId" })
  incident: Incident;

  @ApiProperty({
    example: "2024-06-18T10:00:00.000Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-06-18T10:00:00.000Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
