import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { AlertingSeverity } from "../entities/alerting-rule.entity";

/**
 * Query parameters for listing alerting rules with optional filters.
 */
export class ListAlertingRulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter rules by component UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  componentId?: string;

  @ApiPropertyOptional({
    description: "Filter rules by environment UUID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({
    enum: AlertingSeverity,
    description: "Filter rules by severity level",
    example: AlertingSeverity.WARNING,
  })
  @IsOptional()
  @IsEnum(AlertingSeverity)
  severity?: AlertingSeverity;

  @ApiPropertyOptional({
    description: "Filter rules by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: "Filter by enabled status",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;
}
