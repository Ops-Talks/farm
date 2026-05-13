import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { dateTransformer } from "../../../common/transformers/date.transformer";
import { dateColumnType } from "../../../common/utils/column-type.util";

/**
 * Records a temporary password reset issued by a platform admin.
 * The plaintext temp password is never persisted; only its bcrypt hash
 * is stored alongside an expiry. The matching hash is also written to
 * User.password so the user can authenticate with it once.
 */
@Entity("password_resets")
export class PasswordReset {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("IDX_password_resets_userId")
  @Column({ type: "varchar", length: 64 })
  userId: string;

  @Column({ type: "varchar", length: 128 })
  tempPasswordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: dateColumnType(), transformer: dateTransformer })
  expiresAt: Date;

  @Column({
    type: dateColumnType(),
    nullable: true,
    transformer: dateTransformer,
  })
  usedAt: Date | null;
}
