import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Data Transfer Object for creating a new documentation entry.
 */
export class CreateDocumentationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  componentId: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @IsOptional()
  version?: string;
}
