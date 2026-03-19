import { IsIn, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for requesting cloud resource discovery.
 */
export class DiscoverResourcesDto {
  @ApiPropertyOptional({
    enum: ["aws", "gcp", "azure"],
    description: "Cloud provider to discover resources from",
  })
  @IsOptional()
  @IsIn(["aws", "gcp", "azure"])
  provider?: "aws" | "gcp" | "azure";

  @ApiProperty({ description: "Organization UUID" })
  @IsString()
  orgId: string;
}
