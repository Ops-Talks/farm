import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  Length,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { SloMetricType, SloWindow } from "../entities/slo.entity";

/**
 * DTO for creating a new Service Level Objective.
 */
export class CreateSloDto {
  @ApiProperty({
    example: "api-availability",
    description: "Unique name for the SLO",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    example: "API gateway must maintain 99.95% availability",
    description: "Human-readable description of the SLO",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 99.95,
    description: "Target percentage for the SLO (0-100)",
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  targetPercent: number;

  @ApiProperty({
    enum: SloMetricType,
    example: SloMetricType.AVAILABILITY,
    description: "Type of metric this SLO tracks",
  })
  @IsEnum(SloMetricType)
  metricType: SloMetricType;

  @ApiProperty({
    enum: SloWindow,
    example: SloWindow.THIRTY_DAYS,
    description: "Rolling time window for SLO evaluation",
  })
  @IsEnum(SloWindow)
  window: SloWindow;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Optional component UUID this SLO is scoped to",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiProperty({
    example: true,
    description: "Whether the SLO is active",
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this SLO belongs to",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
