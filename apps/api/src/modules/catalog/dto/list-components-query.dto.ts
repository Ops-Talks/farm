import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ComponentKindGroup } from "../entities/component.entity";

/**
 * Query parameters for listing components with optional filters.
 */
export class ListComponentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      "Filter components by domain group (dev, infra, data, security)",
    example: ComponentKindGroup.DEV,
    enum: ComponentKindGroup,
  })
  @IsOptional()
  @IsEnum(ComponentKindGroup)
  kindGroup?: ComponentKindGroup;

  @ApiPropertyOptional({
    description: "Filter components by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
