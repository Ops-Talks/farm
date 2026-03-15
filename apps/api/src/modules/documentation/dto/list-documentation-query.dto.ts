import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ListDocumentationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter docs by component UUID",
  })
  @IsOptional()
  @IsUUID()
  componentId?: string;
}
