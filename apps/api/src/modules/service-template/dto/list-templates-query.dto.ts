import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

/**
 * Query parameters for listing service templates with optional filters.
 */
export class ListTemplatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter templates by programming language",
    example: "typescript",
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: "Filter templates by framework",
    example: "nestjs",
  })
  @IsOptional()
  @IsString()
  framework?: string;

  @ApiPropertyOptional({
    description: "Filter templates by organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440100",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
