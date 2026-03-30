import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Length,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for updating an existing environment request.
 * Only name, description, and ttlHours may be changed.
 * Type and tier cannot be modified after creation.
 */
export class UpdateEnvironmentRequestDto {
  @ApiPropertyOptional({
    example: "staging-feature-y",
    description: "Updated name for the environment request",
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({
    example: "Updated description for the environment",
    description: "Updated description of the request",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 48,
    description: "Updated time to live in hours (1-720)",
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(720)
  ttlHours?: number;
}
