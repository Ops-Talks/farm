import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Organization } from "./organization.entity";

/**
 * Enumeration of possible invitation states.
 */
export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

/**
 * Represents a pending email-based invitation to join an organization.
 * The plain invitation token is sent to the recipient and never persisted;
 * only its SHA-256 hash is stored.
 */
@Entity("org_invitations")
export class OrgInvitation {
  @ApiProperty({ description: "Auto-generated UUID primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: "UUID of the organization this invitation belongs to",
  })
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organizationId" })
  organization: Organization;

  @ApiProperty({ description: "Email address of the invitee" })
  @Column({ type: "varchar", length: 255 })
  email: string;

  /** SHA-256 hash of the plain token that was emailed to the invitee. */
  @Column({ type: "varchar", length: 64 })
  @Index({ unique: true })
  tokenHash: string;

  @ApiProperty({
    description: "Current status of the invitation",
    enum: InvitationStatus,
    enumName: "InvitationStatus",
  })
  @Column({
    type: "varchar",
    length: 20,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  /** The organization role that will be assigned upon acceptance. */
  @ApiProperty({ description: "Role assigned to the member upon acceptance" })
  @Column({ type: "varchar", length: 20, default: "member" })
  role: string;

  @ApiProperty({ description: "Timestamp when the invitation expires" })
  @Column()
  expiresAt: Date;

  @ApiProperty({
    description: "UUID of the user who sent the invitation",
    nullable: true,
  })
  @Column({ type: "varchar", length: 36, nullable: true })
  invitedByUserId: string | null;

  @ApiProperty({ description: "Row creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Row last-update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;
}
