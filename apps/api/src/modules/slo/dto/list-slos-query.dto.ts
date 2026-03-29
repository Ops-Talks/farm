import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { SloMetricType, SloWindow } from "../entities/slo.entity";

/**
 * Query parameters for listing SLOs with optional filters.
 */
export class ListSlosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter SLOs by component UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  componentId?: string;

  @ApiPropertyOptional({
    enum: SloMetricType,
    description: "Filter SLOs by metric type",
    example: SloMetricType.AVAILABILITY,
  })
  @IsOptional()
  @IsEnum(SloMetricType)
  metricType?: SloMetricType;

  @ApiPropertyOptional({
    enum: SloWindow,
    description: "Filter SLOs by evaluation window",
    example: SloWindow.THIRTY_DAYS,
  })
  @IsOptional()
  @IsEnum(SloWindow)
  window?: SloWindow;

  @ApiPropertyOptional({
    description: "Filter SLOs by organization UUID",
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
  @Transform(({ value }: { value: unknown }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  enabled?: boolean;
}
