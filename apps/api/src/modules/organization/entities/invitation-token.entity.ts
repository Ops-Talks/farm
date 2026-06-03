import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
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
  @ApiProperty({ description: "Auto-generated UUID primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** The plain-text token is the secret; it is never exposed in API responses. */
  @Index("IDX_invitation_tokens_token", { unique: true })
  @Column({ type: "varchar", length: 128 })
  token: string;

  @ApiProperty({
    description: "Token type (always org-invite for this entity)",
    enum: ["org-invite"],
    default: "org-invite",
  })
  @Column({
    type: "simple-enum",
    enum: ["org-invite"],
    default: "org-invite",
  })
  type: "org-invite";

  @ApiProperty({ description: "Email address of the invited user" })
  @Column({ type: "varchar", length: 255 })
  email: string;

  @ApiProperty({
    description: "UUID of the organization the invitation is for",
  })
  @Column({ type: "varchar", length: 64 })
  orgId: string;

  @ApiProperty({ description: "UUID or username of the inviting user" })
  @Column({ type: "varchar", length: 64 })
  invitedBy: string;

  @ApiProperty({
    description: "Role the invitee will receive upon acceptance",
    enum: OrgRole,
    enumName: "OrgRole",
  })
  @Column({ type: "simple-enum", enum: OrgRole })
  role: OrgRole;

  @ApiProperty({
    description: "Optional personal message included in the invitation email",
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar", length: 1024 })
  message: string | null;

  @ApiProperty({
    description: "Current lifecycle status of the invitation token",
    enum: ["pending", "accepted", "revoked"],
    default: "pending",
  })
  @Column({
    type: "simple-enum",
    enum: ["pending", "accepted", "revoked"],
    default: "pending",
  })
  status: InvitationTokenStatus;

  @ApiProperty({ description: "Row creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Timestamp when the invitation expires" })
  @Column({ type: "timestamp", transformer: dateTransformer })
  expiresAt: Date;

  @ApiProperty({
    description: "Timestamp when the invitation was accepted; null if pending",
    nullable: true,
  })
  @Column({
    type: "timestamp",
    nullable: true,
    transformer: dateTransformer,
  })
  acceptedAt: Date | null;

  @ApiProperty({
    description:
      "UUID or username of the user who accepted the invitation; null if pending",
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar", length: 64 })
  acceptedBy: string | null;
}
