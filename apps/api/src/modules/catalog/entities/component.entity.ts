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
  Index,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
 * Helm chart metadata attached to a catalog component.
 * Used to associate a component with its Helm chart deployment artifact.
 */
export interface HelmChartMetadata {
  /** Helm repository URL, e.g. "https://charts.bitnami.com/bitnami" */
  repo?: string;
  /** Chart name, e.g. "postgresql" */
  chart?: string;
  /** Pinned chart version, e.g. "12.1.0" */
  version?: string;
  /** URL or Kubernetes Secret name referencing the values file */
  valuesRef?: string;
}

/**
 * Container image metadata associated with a catalog component.
 */
export interface ContainerImageMetadata {
  /** Registry type identifier, e.g. "ecr", "gcr", "dockerhub" */
  registry: string;
  /** Image name/path, e.g. "myorg/myapp" or "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp" */
  image: string;
  /** Latest resolved tag, e.g. "1.2.3" or "latest" */
  latestTag?: string;
  /** Image digest, e.g. "sha256:abc123..." */
  digest?: string;
  /** When the image was last pushed to the registry */
  pushedAt?: Date;
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
  @Index()
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
    example: {
      repo: "https://charts.bitnami.com/bitnami",
      chart: "postgresql",
      version: "12.1.0",
    },
    description: "Helm chart metadata for this component",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  helmChart: HelmChartMetadata | null;

  @ApiProperty({
    example: "my-app",
    description: "ArgoCD application name associated with this component",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true, type: "varchar" })
  argocdApp: string | null;

  @ApiProperty({
    description: "Container image metadata associated with this component",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  containerImage: ContainerImageMetadata | null;

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
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "The UUID of the organization this component belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @ApiPropertyOptional({
    example: 50.0,
    description:
      "Monthly cost budget threshold in USD; alerts fire when exceeded",
    nullable: true,
  })
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  costBudgetUsd: number | null;

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
