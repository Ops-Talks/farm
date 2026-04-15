import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUrl,
  IsOptional,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IacEngine, IacProvider } from "../entities/iac-module.entity";

/**
 * Payload for creating a new IaC module catalog entry.
 */
export class CreateIacModuleDto {
  @ApiProperty({
    example: "terraform-aws-vpc",
    description: "Human-readable module name",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: IacProvider,
    example: IacProvider.AWS,
    description: "Cloud or infrastructure provider this module targets",
  })
  @IsEnum(IacProvider)
  provider: IacProvider;

  @ApiPropertyOptional({
    enum: IacEngine,
    example: IacEngine.TERRAFORM,
    description: "IaC engine used to run this module",
  })
  @IsOptional()
  @IsEnum(IacEngine)
  engine?: IacEngine | null;

  @ApiProperty({
    example: "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    description: "Source repository URL used for tag discovery and HCL parsing",
  })
  @IsUrl()
  sourceRepoUrl: string;

  @ApiPropertyOptional({
    example: "Terraform module for creating a VPC on AWS",
    description: "Short description of what the module provisions",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: "comp-uuid-1234",
    description: "Optional catalog component to associate with this module",
  })
  @IsOptional()
  @IsString()
  componentId?: string;
}
