import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

/**
 * Query parameters for listing pipelines with optional organization filter.
 */
export class ListPipelinesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter pipelines by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
