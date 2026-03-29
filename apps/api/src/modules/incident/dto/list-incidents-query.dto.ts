import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { IncidentSeverity, IncidentStatus } from "../entities/incident.entity";

/**
 * Query parameters for listing incidents with optional filters.
 */
export class ListIncidentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: IncidentSeverity,
    description: "Filter incidents by severity",
    example: IncidentSeverity.P1,
  })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({
    enum: IncidentStatus,
    description: "Filter incidents by status",
    example: IncidentStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({
    description: "Filter incidents affecting a specific component UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  componentId?: string;

  @ApiPropertyOptional({
    description: "Filter incidents affecting a specific environment UUID",
    example: "550e8400-e29b-41d4-a716-446655440010",
  })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({
    description: "Filter incidents by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
