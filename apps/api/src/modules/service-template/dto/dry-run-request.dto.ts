import { IsObject, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Request body for the dry-run validation endpoint.
 */
export class DryRunRequestDto {
  @ApiPropertyOptional({
    example: { SERVICE_NAME: "my-service", PORT: "3000" },
    description:
      "Key-value pairs of template variables to validate and preview",
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
