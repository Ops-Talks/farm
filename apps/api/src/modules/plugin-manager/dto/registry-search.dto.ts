import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for searching the plugin registry.
 */
export class RegistrySearchDto {
  @ApiPropertyOptional({
    description: "Full-text search query matched against name and description",
    example: "slack",
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: "Filter by plugin category",
    example: "messaging",
  })
  @IsString()
  @IsOptional()
  category?: string;
}
