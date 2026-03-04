/**
 * Represents a technical documentation entry in Farm.
 * Documentation is associated with a component in the catalog.
 */
export class Documentation {
  id: string;
  title: string;
  content: string;
  componentId: string;
  author: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}
