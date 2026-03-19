import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for listing resource violations with optional filters.
 */
export class ListViolationsDto {
  @ApiProperty({
    example: "org-uuid-1",
    description: "Organization UUID to scope the query",
  })
  @IsString()
  @IsNotEmpty()
  orgId: string;

  @ApiPropertyOptional({
    example: "aws",
    description: "Filter by cloud provider (aws, gcp, azure, kubernetes)",
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    example: "ecs-service",
    description: "Filter by resource type",
  })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      "When false return only active violations; when true return only resolved ones",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  resolved?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of records to skip",
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }: { value: unknown }) => Number(value))
  skip?: number = 0;

  @ApiPropertyOptional({
    example: 20,
    description: "Number of records to return",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }: { value: unknown }) => Number(value))
  take?: number = 20;
}
