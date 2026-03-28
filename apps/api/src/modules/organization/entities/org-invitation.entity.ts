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
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organizationId" })
  organization: Organization;

  @Column({ type: "varchar", length: 255 })
  email: string;

  /** SHA-256 hash of the plain token that was emailed to the invitee. */
  @Column({ type: "varchar", length: 64 })
  @Index({ unique: true })
  tokenHash: string;

  @Column({
    type: "varchar",
    length: 20,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  /** The organization role that will be assigned upon acceptance. */
  @Column({ type: "varchar", length: 20, default: "member" })
  role: string;

  @Column({
    type: "varchar",
    length: 30,
  })
  expiresAt: Date;

  @Column({ type: "uuid", nullable: true })
  invitedByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
