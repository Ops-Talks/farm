import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for creating a new documentation entry.
 */
export class CreateDocumentationDto {
  @ApiProperty({
    example: "Getting Started",
    description: "Documentation title",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: "# Content\nMarkdown content here.",
    description: "The Markdown content",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The component ID this documentation belongs to",
  })
  @IsString()
  @IsNotEmpty()
  componentId: string;

  @ApiProperty({ example: "john_doe", description: "The author username" })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({
    example: "1.0.0",
    description: "Documentation version",
    required: false,
  })
  @IsString()
  @IsOptional()
  version?: string;
}
