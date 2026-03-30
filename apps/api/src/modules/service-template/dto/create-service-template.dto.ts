import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsArray,
  IsUUID,
  IsBoolean,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TemplateVariable } from "../entities/service-template.entity";

/**
 * DTO for creating a new service template.
 */
export class CreateServiceTemplateDto {
  @ApiProperty({
    example: "nestjs-api",
    description: "Unique name for the service template",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({
    example: "Production-ready NestJS API template with TypeORM and Swagger",
    description: "Human-readable description of the template",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "typescript",
    description: "Programming language used by the template",
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    example: "nestjs",
    description: "Framework used by the template",
  })
  @IsString()
  @IsNotEmpty()
  framework: string;

  @ApiPropertyOptional({
    example: ["api", "backend", "microservice"],
    description: "Tags for categorizing the template",
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: "https://github.com/org/nestjs-api-template",
    description: "URL of the repository containing the template source",
  })
  @IsUrl()
  @IsNotEmpty()
  repositoryUrl: string;

  @ApiPropertyOptional({
    description: "Template variables that can be provided during scaffolding",
  })
  @IsArray()
  @IsOptional()
  variables?: TemplateVariable[];

  @ApiPropertyOptional({
    example: true,
    description: "Whether this is a built-in template",
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isBuiltIn?: boolean;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this template belongs to",
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
