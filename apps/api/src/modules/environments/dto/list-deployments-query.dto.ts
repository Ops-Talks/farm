import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { DeploymentStatus } from "../entities/deployment.entity";

export class ListDeploymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by component UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  componentId?: string;

  @ApiPropertyOptional({
    description: "Filter by environment UUID",
    example: "550e8400-e29b-41d4-a716-446655440010",
  })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({
    description: "Filter by deployment status",
    enum: DeploymentStatus,
    example: DeploymentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(DeploymentStatus)
  status?: DeploymentStatus;
}
