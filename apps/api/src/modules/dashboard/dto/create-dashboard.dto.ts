import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DashboardVisibility } from "../entities/dashboard.entity";

/**
 * DTO for creating a new dashboard.
 */
export class CreateDashboardDto {
  @ApiProperty({
    example: "Production Overview",
    description: "Display name for the dashboard",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({
    example: "High-level production health metrics",
    description: "Optional description of the dashboard",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: DashboardVisibility,
    example: DashboardVisibility.PRIVATE,
    description: "Visibility scope of the dashboard",
    default: DashboardVisibility.PRIVATE,
  })
  @IsEnum(DashboardVisibility)
  @IsOptional()
  visibility?: DashboardVisibility;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this dashboard belongs to",
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
