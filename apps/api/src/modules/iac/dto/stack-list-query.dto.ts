import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for the GET /iac/stacks list endpoint.
 * Both filters are optional; omitting them returns all stacks.
 */
export class StackListQueryDto {
  @ApiPropertyOptional({
    example: "production",
    description: "Return only stacks in the given environment",
  })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({
    example: "comp-uuid-1234",
    description:
      "Return only stacks linked to the given catalog component UUID",
  })
  @IsOptional()
  @IsString()
  componentId?: string;
}
