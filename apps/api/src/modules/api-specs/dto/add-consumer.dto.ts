import { IsOptional, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Data transfer object for registering a consumer of an API spec.
 * At least one of consumerComponentId or consumerTeamId must be provided.
 */
export class AddConsumerDto {
  @ApiPropertyOptional({
    description: "UUID of the consuming catalog component",
  })
  @IsOptional()
  @IsUUID()
  consumerComponentId?: string;

  @ApiPropertyOptional({ description: "UUID of the consuming team" })
  @IsOptional()
  @IsUUID()
  consumerTeamId?: string;
}
