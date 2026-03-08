import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents the kind of a catalog entity.
 * Aligned with Backstage model and extended for Infra, Data, and Security teams.
 */
export enum ComponentKind {
  // Dev kinds
  SERVICE = "service",
  LIBRARY = "library",
  WEBSITE = "website",
  API = "api",
  COMPONENT = "component",
  SYSTEM = "system",
  DOMAIN = "domain",
  RESOURCE = "resource",

  // Infrastructure kinds
  PIPELINE = "pipeline",
  QUEUE = "queue",
  DATABASE = "database",
  STORAGE = "storage",
  CLUSTER = "cluster",
  NETWORK = "network",

  // Data kinds
  DATASET = "dataset",
  DATA_PIPELINE = "data-pipeline",
  ML_MODEL = "ml-model",

  // Security kinds
  SECRET = "secret",
  POLICY = "policy",
  CERTIFICATE = "certificate",
}

/**
 * Logical grouping of component kinds by team domain.
 */
export enum ComponentKindGroup {
  DEV = "dev",
  INFRA = "infra",
  DATA = "data",
  SECURITY = "security",
}

/**
 * Maps each ComponentKind to its logical group.
 */
export const COMPONENT_KIND_GROUPS: Record<ComponentKind, ComponentKindGroup> =
  {
    [ComponentKind.SERVICE]: ComponentKindGroup.DEV,
    [ComponentKind.LIBRARY]: ComponentKindGroup.DEV,
    [ComponentKind.WEBSITE]: ComponentKindGroup.DEV,
    [ComponentKind.API]: ComponentKindGroup.DEV,
    [ComponentKind.COMPONENT]: ComponentKindGroup.DEV,
    [ComponentKind.SYSTEM]: ComponentKindGroup.DEV,
    [ComponentKind.DOMAIN]: ComponentKindGroup.DEV,
    [ComponentKind.RESOURCE]: ComponentKindGroup.DEV,

    [ComponentKind.PIPELINE]: ComponentKindGroup.INFRA,
    [ComponentKind.QUEUE]: ComponentKindGroup.INFRA,
    [ComponentKind.DATABASE]: ComponentKindGroup.INFRA,
    [ComponentKind.STORAGE]: ComponentKindGroup.INFRA,
    [ComponentKind.CLUSTER]: ComponentKindGroup.INFRA,
    [ComponentKind.NETWORK]: ComponentKindGroup.INFRA,

    [ComponentKind.DATASET]: ComponentKindGroup.DATA,
    [ComponentKind.DATA_PIPELINE]: ComponentKindGroup.DATA,
    [ComponentKind.ML_MODEL]: ComponentKindGroup.DATA,

    [ComponentKind.SECRET]: ComponentKindGroup.SECURITY,
    [ComponentKind.POLICY]: ComponentKindGroup.SECURITY,
    [ComponentKind.CERTIFICATE]: ComponentKindGroup.SECURITY,
  };

/**
 * Represents the lifecycle stage of a component.
 */
export enum ComponentLifecycle {
  PLANNED = "planned",
  EXPERIMENTAL = "experimental",
  PRODUCTION = "production",
  DEPRECATED = "deprecated",
  DECOMMISSIONED = "decommissioned",
}

/**
 * Represents an external link associated with a component.
 */
export class ComponentLink {
  @ApiProperty({ example: "GitHub", description: "The title of the link" })
  title: string;

  @ApiProperty({
    example: "https://github.com/org/repo",
    description: "The URL of the link",
  })
  url: string;

  @ApiProperty({
    example: "github",
    description: "Optional icon identifier",
    required: false,
  })
  icon?: string;
}

/**
 * Represents a software component in the Farm catalog.
 */
@Entity("components")
export class Component {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ example: "user-service", description: "The component name" })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    enum: ComponentKind,
    example: ComponentKind.SERVICE,
    description: "The kind of component",
  })
  @Column({ default: ComponentKind.SERVICE })
  kind: ComponentKind;

  @ApiProperty({
    example: "Manages user profiles and authentication",
    description: "Description of the component",
    required: false,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ example: "platform-team", description: "The owner team/user" })
  @Column()
  owner: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440050",
    description: "The ID of the owning team (replaces owner string)",
    required: false,
    deprecated: true,
  })
  @Column({ nullable: true })
  teamId: string;

  @ManyToOne("Team", { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "teamId" })
  team: any;

  @ApiProperty({
    enum: ComponentLifecycle,
    example: ComponentLifecycle.PRODUCTION,
    description: "The lifecycle stage",
  })
  @Column({ default: ComponentLifecycle.EXPERIMENTAL })
  lifecycle: ComponentLifecycle;

  @ApiProperty({
    example: ["java", "microservice"],
    description: "Tags for categorization",
    required: false,
  })
  @Column("simple-array", { nullable: true })
  tags: string[];

  @ApiProperty({
    type: [ComponentLink],
    description: "Related external links",
    required: false,
  })
  @Column("simple-json", { nullable: true })
  links: ComponentLink[];

  @ApiProperty({
    example: { repository: "git@github.com:org/repo.git" },
    description: "Additional metadata",
    required: false,
  })
  @Column("simple-json", { nullable: true })
  metadata: Record<string, unknown>;

  @ApiProperty({
    type: () => [Component],
    description: "Components that this component depends on",
    required: false,
  })
  @ManyToMany(() => Component)
  @JoinTable({
    name: "component_dependencies",
    joinColumn: { name: "component_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "dependency_id", referencedColumnName: "id" },
  })
  dependencies: Component[];

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
