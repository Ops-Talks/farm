import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { UserOrganization } from "./user-organization.entity";

/**
 * Represents a multi-tenant organization in the Farm system.
 * All catalog resources can be scoped to an organization.
 */
@Entity("organizations")
export class Organization {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "Acme Corp",
    description: "The unique organization name",
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: "acme-corp",
    description: "URL-friendly unique slug derived from the organization name",
  })
  @Index()
  @Column({ unique: true })
  slug: string;

  @ApiProperty({
    example: "Global leader in ACME products",
    description: "Optional description of the organization",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "The UUID of the user who owns the organization",
  })
  @Index()
  @Column({ type: "uuid" })
  ownerId: string;

  @OneToMany(() => UserOrganization, (uo) => uo.organization, {
    cascade: true,
  })
  userOrganizations: UserOrganization[];

  @Column({ type: "simple-json", nullable: true })
  settings: Record<string, unknown> | null;

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
