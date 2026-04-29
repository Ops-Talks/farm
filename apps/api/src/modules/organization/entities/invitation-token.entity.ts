import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { OrgRole } from "@farm/types";
import { dateTransformer } from "../../../common/transformers/date.transformer";

/**
 * Status of an invitation token.
 */
export type InvitationTokenStatus = "pending" | "accepted" | "revoked";

/**
 * Token-based invitation to join an organization.
 * The plain-text token is sent to the recipient via email and is the secret
 * used to accept the invitation. Token uniqueness is enforced at the column
 * level (32-byte hex).
 */
@Entity("invitation_tokens")
@Index("IDX_invitation_tokens_email_org", ["email", "orgId"])
@Index("IDX_invitation_tokens_status_created", ["status", "createdAt"])
export class InvitationToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("IDX_invitation_tokens_token", { unique: true })
  @Column({ type: "varchar", length: 128 })
  token: string;

  @Column({
    type: "simple-enum",
    enum: ["org-invite"],
    default: "org-invite",
  })
  type: "org-invite";

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 64 })
  orgId: string;

  @Column({ type: "varchar", length: 64 })
  invitedBy: string;

  @Column({ type: "simple-enum", enum: OrgRole })
  role: OrgRole;

  @Column({ nullable: true, type: "varchar", length: 1024 })
  message: string | null;

  @Column({
    type: "simple-enum",
    enum: ["pending", "accepted", "revoked"],
    default: "pending",
  })
  status: InvitationTokenStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamp", transformer: dateTransformer })
  expiresAt: Date;

  @Column({ nullable: true, type: "timestamp", transformer: dateTransformer })
  acceptedAt: Date | null;

  @Column({ nullable: true, type: "varchar", length: 64 })
  acceptedBy: string | null;
}
