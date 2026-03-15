import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsObject,
  Length,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { EnvironmentType } from "../entities/environment.entity";

/**
 * Data Transfer Object for creating a new environment.
 */
export class CreateEnvironmentDto {
  @ApiProperty({
    example: "production",
    description: "Unique environment name",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @ApiProperty({
    enum: EnvironmentType,
    example: EnvironmentType.PRODUCTION,
    description: "The type of environment",
  })
  @IsEnum(EnvironmentType)
  type: EnvironmentType;

  @ApiProperty({
    example: "Production environment for all services",
    description: "Description of the environment",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 3,
    description: "Display order for sorting",
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiProperty({
    example: { region: "us-east-1" },
    description: "Additional metadata",
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
