import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../auth/entities/user.entity";

/**
 * Represents the type of a team by domain focus.
 */
export enum TeamType {
  DEV = "dev",
  INFRA = "infra",
  SECURITY = "security",
  DATA = "data",
  PLATFORM = "platform",
  OTHER = "other",
}

/**
 * Represents an organizational team that can own components and contain members.
 */
@Entity("teams")
export class Team {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440050",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "platform-team",
    description: "Unique team identifier (slug)",
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: "Platform Engineering",
    description: "Human-readable team name",
  })
  @Column()
  displayName: string;

  @ApiProperty({
    example: "Responsible for internal platform services and developer tooling",
    description: "Team description",
    required: false,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    enum: TeamType,
    example: TeamType.PLATFORM,
    description: "The domain focus of the team",
  })
  @Column({ default: TeamType.OTHER })
  type: TeamType;

  @ApiProperty({
    example: "platform-team@example.com",
    description: "Team contact email",
    required: false,
  })
  @Column({ nullable: true })
  contactEmail: string;

  @ApiProperty({
    example: "#platform-team",
    description: "Slack channel for the team",
    required: false,
  })
  @Column({ nullable: true })
  slackChannel: string;

  @ApiProperty({
    example: { oncallRotation: "https://pagerduty.com/team/platform" },
    description: "Additional metadata",
    required: false,
  })
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;

  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: "team_members",
    joinColumn: { name: "team_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "user_id", referencedColumnName: "id" },
  })
  members: User[];

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization this team belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiProperty({
    example: "keycloak-group-uuid-1234",
    description:
      "External system identifier for this team (e.g. Keycloak group ID)",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  externalId: string | null;

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
