import { PartialType } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber } from "class-validator";
import { CreateComponentDto } from "./create-component.dto";

/**
 * Data Transfer Object for updating an existing component.
 * All fields from CreateComponentDto are optional.
 * Extends with FinOps-specific budget configuration.
 */
export class UpdateComponentDto extends PartialType(CreateComponentDto) {
  @ApiPropertyOptional({
    example: 50.0,
    description: "Monthly cost budget in USD",
  })
  @IsOptional()
  @IsNumber()
  costBudgetUsd?: number;
}
