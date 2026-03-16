import { IsString, IsNotEmpty, IsOptional, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a new organization.
 */
export class CreateOrganizationDto {
  @ApiProperty({
    example: "Acme Corp",
    description: "The unique organization name (2-100 characters)",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({
    example: "Global leader in ACME products",
    description: "Optional description of the organization",
  })
  @IsString()
  @IsOptional()
  description?: string;
}
