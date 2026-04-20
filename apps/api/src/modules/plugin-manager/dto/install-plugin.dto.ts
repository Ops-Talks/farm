import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Request body for installing a plugin into an organization.
 */
export class InstallPluginDto {
  @ApiPropertyOptional({
    description: "Organization ID to install the plugin into",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @IsOptional()
  orgId?: string;
}
