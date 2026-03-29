import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { DashboardVisibility } from "../entities/dashboard.entity";

/**
 * Query parameters for listing dashboards with optional filters.
 */
export class ListDashboardsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter dashboards by owner user UUID",
    example: "550e8400-e29b-41d4-a716-446655440010",
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    enum: DashboardVisibility,
    description: "Filter dashboards by visibility level",
    example: DashboardVisibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(DashboardVisibility)
  visibility?: DashboardVisibility;

  @ApiPropertyOptional({
    description: "Filter dashboards by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
