import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

/**
 * Query parameters accepted by the GET /search/advanced endpoint.
 * Supports full-text search with optional facet filters and pagination.
 */
export class AdvancedSearchQueryDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({ description: "Search term (minimum 2 characters)" })
  q: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? [value] : value,
  )
  @ApiProperty({
    required: false,
    isArray: true,
    description: "Filter results to one or more entity types",
  })
  types?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: "Filter results to a specific namespace",
  })
  namespace?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? [value] : value,
  )
  @ApiProperty({
    required: false,
    isArray: true,
    description: "Filter results to documents that contain all of these tags",
  })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({
    required: false,
    default: 1,
    description: "Page number (1-based)",
  })
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiProperty({
    required: false,
    default: 20,
    description: "Results per page (max 100)",
  })
  limit?: number;
}
