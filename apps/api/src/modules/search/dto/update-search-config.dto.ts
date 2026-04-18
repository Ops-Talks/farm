import { IsNumber, IsOptional, IsString, Min } from "class-validator";

/**
 * Payload for PATCH /search/config.
 * All fields are optional; only supplied fields are updated.
 */
export class UpdateSearchConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  titleBoost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tagsBoost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descriptionBoost?: number;

  @IsOptional()
  @IsString()
  fuzziness?: string;
}
