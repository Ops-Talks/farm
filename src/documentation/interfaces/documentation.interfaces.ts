import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a node in the documentation navigation tree.
 */
export class DocumentationTreeNode {
  @ApiProperty({ example: "doc-uuid-1", description: "Documentation ID" })
  id: string;

  @ApiProperty({ example: "Getting Started", description: "Document title" })
  title: string;

  @ApiProperty({
    example: null,
    description: "Parent document ID",
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({ example: 0, description: "Sort order" })
  order: number;

  @ApiProperty({
    type: () => [DocumentationTreeNode],
    description: "Child documents",
  })
  children: DocumentationTreeNode[];
}

/**
 * Represents a documentation search result.
 */
export class SearchResult {
  @ApiProperty({ example: "doc-uuid-1", description: "Documentation ID" })
  id: string;

  @ApiProperty({
    example: "API Getting Started",
    description: "Document title",
  })
  title: string;

  @ApiProperty({ example: "comp-uuid-1", description: "Component ID" })
  componentId: string;

  @ApiProperty({
    example: 0.85,
    description: "Relevance score (0 to 1)",
  })
  score: number;
}
