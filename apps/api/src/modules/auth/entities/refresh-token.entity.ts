import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";
import { dateColumnType } from "../../../common/utils/column-type.util";
import { dateTransformer } from "../../../common/transformers/date.transformer";

/**
 * Represents a single issued refresh token.
 *
 * Design decisions:
 * - The raw token is never stored; only its SHA-256 hex digest (jti) is persisted.
 * - Each token belongs to a family (familyId).  When a revoked token is presented
 *   all tokens sharing the same familyId are revoked immediately (reuse detection).
 * - The one-to-many relationship with User has CASCADE DELETE so tokens are
 *   automatically removed when a user account is deleted.
 */
@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("IDX_refresh_tokens_userId")
  @Column({ type: "uuid" })
  userId: string;

  /**
   * SHA-256 hex digest of the raw token.  Unique to prevent duplicate issuance.
   */
  @Index("IDX_refresh_tokens_jti", { unique: true })
  @Column({ type: "varchar", unique: true })
  jti: string;

  /**
   * Groups tokens issued for the same login session across rotations.
   * Presenting a revoked token causes the entire family to be invalidated.
   */
  @Column({ type: "uuid", nullable: true })
  familyId: string | null;

  @Column({ type: dateColumnType(), transformer: dateTransformer })
  issuedAt: Date;

  @Column({ type: dateColumnType(), transformer: dateTransformer })
  expiresAt: Date;

  @Column({
    type: dateColumnType(),
    nullable: true,
    transformer: dateTransformer,
  })
  revokedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  userAgent: string | null;

  @Column({ type: "varchar", nullable: true })
  ip: string | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
