import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import {
  EnvironmentRequestStatus,
  EnvironmentType,
} from "../entities/environment-request.entity";

/**
 * Query parameters for listing environment requests with optional filters.
 */
export class ListEnvironmentRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: EnvironmentRequestStatus,
    description: "Filter by request status",
    example: EnvironmentRequestStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(EnvironmentRequestStatus)
  status?: EnvironmentRequestStatus;

  @ApiPropertyOptional({
    enum: EnvironmentType,
    description: "Filter by environment type",
    example: EnvironmentType.EPHEMERAL,
  })
  @IsOptional()
  @IsEnum(EnvironmentType)
  type?: EnvironmentType;

  @ApiPropertyOptional({
    description: "Filter by the user ID who requested the environment",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  requestedBy?: string;

  @ApiPropertyOptional({
    description: "Filter by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
