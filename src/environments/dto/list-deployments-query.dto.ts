import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { DeploymentStatus } from "../entities/deployment.entity";

export class ListDeploymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by component UUID",
  })
  @IsOptional()
  @IsUUID()
  componentId?: string;

  @ApiPropertyOptional({
    description: "Filter by environment UUID",
  })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({
    description: "Filter by deployment status",
    enum: DeploymentStatus,
  })
  @IsOptional()
  @IsEnum(DeploymentStatus)
  status?: DeploymentStatus;
}
