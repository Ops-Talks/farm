/**
 * Represents the type of a software component in the catalog.
 * Mirrors Backstage component kinds to provide a familiar structure.
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
 * Represents a software component in the Farm catalog.
 * A component is any trackable piece of software in the organization.
 */
export class Component {
  id: string;
  name: string;
  kind: ComponentKind;
  description: string;
  owner: string;
  lifecycle: ComponentLifecycle;
  tags: string[];
  links: ComponentLink[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents an external link associated with a component.
 */
export class ComponentLink {
  title: string;
  url: string;
  icon?: string;
}
