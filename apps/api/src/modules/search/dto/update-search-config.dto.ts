import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

/**
 * Payload for PATCH /search/config.
 * All fields are optional; only supplied fields are updated.
 */
export class UpdateSearchConfigDto {
  @ApiPropertyOptional({
    example: 2.0,
    description: "Boost multiplier for title matches",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  titleBoost?: number;

  @ApiPropertyOptional({
    example: 1.5,
    description: "Boost multiplier for tag matches",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tagsBoost?: number;

  @ApiPropertyOptional({
    example: 1.0,
    description: "Boost multiplier for description matches",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descriptionBoost?: number;

  @ApiPropertyOptional({
    example: "AUTO",
    description: "Fuzziness level for text search",
  })
  @IsOptional()
  @IsString()
  fuzziness?: string;
}
