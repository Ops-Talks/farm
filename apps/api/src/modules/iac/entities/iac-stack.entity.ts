import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { IacRun } from "./iac-run.entity";

/**
 * Represents an Infrastructure-as-Code stack tracked by Farm.
 * A stack is uniquely identified by its name and environment combination
 * within an organization.
 */
@Entity("iac_stacks")
@Index(["name", "environment", "organizationId"], { unique: true })
export class IacStack {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "core-networking",
    description: "Stack name — unique within an environment and organization",
  })
  @Column()
  name: string;

  @ApiProperty({
    example: "production",
    description: "Target deployment environment",
  })
  @Index()
  @Column()
  environment: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this stack belongs to",
    nullable: true,
  })
  @Index()
  @Column({ name: "organization_id", type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "terraform",
    description: "IaC provider: terraform or opentofu",
  })
  @Column()
  provider: string;

  @ApiProperty({
    example: "https://github.com/acme/infra",
    description: "Source repository URL",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  repositoryUrl: string | null;

  @ApiProperty({
    example: "stacks/core-networking",
    description: "Path within the repository containing the stack",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  basePath: string | null;

  @ApiProperty({
    example: "https://app.terraform.io/app/acme/workspaces/core-networking",
    description:
      "Deep link to the external IaC tool (Atlantis, Spacelift, TF Cloud)",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  externalToolUrl: string | null;

  @ApiProperty({
    example: "comp-uuid-1234",
    description:
      "Soft FK reference to a catalog component (no TypeORM relation to avoid circular deps)",
    nullable: true,
  })
  @Index()
  @Column({ type: "varchar", nullable: true })
  componentId: string | null;

  @ApiProperty({
    example: false,
    description:
      "True when the stack was created automatically via Cultivator discovery",
    default: false,
  })
  @Column({ default: false })
  autoImported: boolean;

  @OneToMany(() => IacRun, (run) => run.stack)
  runs: IacRun[];

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
