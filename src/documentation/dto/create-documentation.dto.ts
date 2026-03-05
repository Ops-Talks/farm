import { IsNotEmpty, IsString, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for creating a new documentation entry.
 */
export class CreateDocumentationDto {
  @ApiProperty({
    example: "API Getting Started",
    description: "The title of the documentation",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: "https://example.com/docs/getting-started.md",
    description: "The URL of the raw Markdown source file",
  })
  @IsUrl()
  @IsNotEmpty()
  sourceUrl: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The ID of the associated component",
  })
  @IsString()
  @IsNotEmpty()
  componentId: string;

  @ApiProperty({ example: "john_doe", description: "The author username" })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ example: "1.0.0", description: "The documentation version" })
  @IsString()
  @IsNotEmpty()
  version: string;
}
