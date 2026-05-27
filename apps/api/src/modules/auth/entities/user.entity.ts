import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import * as bcrypt from "bcrypt";
import { BCRYPT_ROUNDS } from "../../../common/constants/bcrypt";
import { dateTransformer } from "../../../common/transformers/date.transformer";
import { dateColumnType } from "../../../common/utils/column-type.util";

/**
 * Represents a user in the Farm system.
 */
@Entity("users")
export class User {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ example: "john_doe", description: "The unique username" })
  @Column({ unique: true })
  username: string;

  @ApiProperty({ example: "john@example.com", description: "The user email" })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: "John Doe", description: "The user display name" })
  @Column()
  displayName: string;

  @ApiProperty({ example: "John", required: false })
  @Column({ nullable: true, type: "varchar" })
  firstName: string | null;

  @ApiProperty({ example: "Doe", required: false })
  @Column({ nullable: true, type: "varchar" })
  lastName: string | null;

  @ApiProperty({
    example: "male",
    enum: ["male", "female", "non_binary"],
    required: false,
  })
  @Column({ nullable: true, type: "varchar" })
  gender: "male" | "female" | "non_binary" | null;

  @Exclude()
  @Column()
  password: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password && !this.password.startsWith("$2b$")) {
      this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
    }
  }

  @ApiProperty({ example: ["admin", "user"], description: "The user roles" })
  @Column("simple-array", { nullable: true })
  roles: string[];

  @Exclude()
  @Column({ nullable: true, type: "varchar" })
  refreshToken: string | null;

  @ApiProperty({
    example: "github",
    description: "OAuth provider name (github, google)",
    required: false,
  })
  @Column({ nullable: true, type: "varchar" })
  oauthProvider: string | null;

  @ApiProperty({
    example: "12345678",
    description: "OAuth provider user ID",
    required: false,
  })
  @Column({ nullable: true, type: "varchar" })
  oauthProviderId: string | null;

  @ApiProperty({
    example: false,
    description: "Whether the user account is suspended (cannot login)",
  })
  @Column({ default: false })
  suspended: boolean;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The last successful login timestamp",
    required: false,
    nullable: true,
  })
  @Column({
    type: dateColumnType(),
    nullable: true,
    transformer: dateTransformer,
  })
  lastLogin: Date | null;

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
