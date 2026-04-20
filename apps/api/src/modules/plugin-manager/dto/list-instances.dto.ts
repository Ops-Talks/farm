import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for listing plugin instances.
 */
export class ListInstancesDto {
  @ApiPropertyOptional({
    description: "Filter instances by organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @IsOptional()
  orgId?: string;
}
