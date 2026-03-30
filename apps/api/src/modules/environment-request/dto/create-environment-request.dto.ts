import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  Length,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  EnvironmentType,
  EnvironmentTier,
} from "../entities/environment-request.entity";

/**
 * DTO for creating a new environment request.
 */
export class CreateEnvironmentRequestDto {
  @ApiProperty({
    example: "staging-feature-x",
    description: "Short name for the environment request",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({
    example: "Staging environment for feature X integration testing",
    description: "Human-readable description of the request",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: EnvironmentType,
    example: EnvironmentType.EPHEMERAL,
    description: "Type of environment requested",
  })
  @IsEnum(EnvironmentType)
  type: EnvironmentType;

  @ApiProperty({
    enum: EnvironmentTier,
    example: EnvironmentTier.SMALL,
    description: "Resource tier for the environment",
  })
  @IsEnum(EnvironmentTier)
  tier: EnvironmentTier;

  @ApiPropertyOptional({
    example: 24,
    description: "Time to live in hours (1-720)",
    default: 24,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(720)
  ttlHours?: number;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440003",
    description: "Optional component UUID to link to this request",
  })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this request belongs to",
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
