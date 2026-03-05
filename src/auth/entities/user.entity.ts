import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";

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

  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ example: ["admin", "user"], description: "The user roles" })
  @Column("simple-array", { nullable: true })
  roles: string[];

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
