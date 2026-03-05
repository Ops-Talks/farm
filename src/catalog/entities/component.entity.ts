import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents the type of a software component in the catalog.
 */
export enum ComponentKind {
  SERVICE = "service",
  LIBRARY = "library",
  WEBSITE = "website",
  API = "api",
  COMPONENT = "component",
}

/**
 * Represents the lifecycle stage of a component.
 */
export enum ComponentLifecycle {
  EXPERIMENTAL = "experimental",
  PRODUCTION = "production",
  DEPRECATED = "deprecated",
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
 * A component is any trackable piece of software in the organization.
 */
export class Component {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Unique identifier",
  })
  id: string;

  @ApiProperty({ example: "user-service", description: "The component name" })
  name: string;

  @ApiProperty({
    enum: ComponentKind,
    example: ComponentKind.SERVICE,
    description: "The kind of component",
  })
  kind: ComponentKind;

  @ApiProperty({
    example: "Manages user profiles and authentication",
    description: "Description of the component",
  })
  description: string;

  @ApiProperty({ example: "platform-team", description: "The owner team/user" })
  owner: string;

  @ApiProperty({
    enum: ComponentLifecycle,
    example: ComponentLifecycle.PRODUCTION,
    description: "The lifecycle stage",
  })
  lifecycle: ComponentLifecycle;

  @ApiProperty({
    example: ["java", "microservice"],
    description: "Tags for categorization",
  })
  tags: string[];

  @ApiProperty({ type: [ComponentLink], description: "Related external links" })
  links: ComponentLink[];

  @ApiProperty({
    example: { repository: "git@github.com:org/repo.git" },
    description: "Additional metadata",
  })
  metadata: Record<string, unknown>;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The creation date",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The last update date",
  })
  updatedAt: Date;
}
