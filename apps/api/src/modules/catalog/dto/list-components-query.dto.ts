import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ComponentKindGroup } from "../entities/component.entity";

export class ListComponentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      "Filter components by domain group (dev, infra, data, security)",
    enum: ComponentKindGroup,
  })
  @IsOptional()
  @IsEnum(ComponentKindGroup)
  kindGroup?: ComponentKindGroup;
}
