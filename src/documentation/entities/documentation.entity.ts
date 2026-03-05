import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a technical documentation entry in Farm.
 * Documentation is associated with a component in the catalog.
 */
export class Documentation {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Unique identifier",
  })
  id: string;

  @ApiProperty({
    example: "API Getting Started Guide",
    description: "The title of the documentation",
  })
  title: string;

  @ApiProperty({
    example: "# Getting Started\n\nThis API allows you to...",
    description: "The content of the documentation (Markdown)",
  })
  content: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The ID of the associated component",
  })
  componentId: string;

  @ApiProperty({ example: "john_doe", description: "The author username" })
  author: string;

  @ApiProperty({ example: "1.0.0", description: "The documentation version" })
  version: string;

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
