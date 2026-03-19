import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

/**
 * DTO for requesting cloud cost data.
 */
export class CloudCostDto {
  @ApiPropertyOptional({
    enum: ["aws", "gcp", "azure"],
    description: "Cloud provider to fetch cost data from",
  })
  @IsOptional()
  @IsIn(["aws", "gcp", "azure"])
  provider?: "aws" | "gcp" | "azure";

  @ApiProperty({ description: "Organization UUID" })
  @IsString()
  orgId: string;

  @ApiPropertyOptional({
    description: "Number of days to include in the cost report (default 30)",
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
}

/**
 * A single cost entry for an environment / component.
 */
export class CloudCostEntry {
  @ApiProperty({ description: "Environment name derived from tags" })
  environment: string;

  @ApiPropertyOptional({ description: "Component name derived from tags" })
  component?: string;

  @ApiProperty({ description: "Cost amount" })
  cost: number;

  @ApiProperty({ description: "ISO 4217 currency code, e.g. USD" })
  currency: string;
}
