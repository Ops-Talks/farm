import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";
import { Organization } from "./organization.entity";
import { User } from "../../auth/entities/user.entity";

/**
 * Join entity representing a user's membership in an organization with an assigned role.
 */
@Entity("user_organizations")
@Unique(["userId", "organizationId"])
export class UserOrganization {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440200",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "The UUID of the user",
  })
  @Index()
  @Column({ type: "uuid" })
  userId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization",
  })
  @Index()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({
    enum: OrgRole,
    example: OrgRole.MEMBER,
    description: "The role of the user within the organization",
  })
  @Column({ type: "varchar", default: OrgRole.MEMBER })
  role: OrgRole;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Organization, (org) => org.userOrganizations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "organizationId" })
  organization: Organization;

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
