import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a scaffold request from a service template.
 */
export class CreateScaffoldRequestDto {
  @ApiProperty({
    example: "org/new-service-name",
    description: "Target repository path for the scaffolded service",
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  targetRepository: string;

  @ApiPropertyOptional({
    example: { SERVICE_NAME: "my-service", PORT: "3000" },
    description: "Key-value pairs of template variables",
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    example: false,
    description:
      "When true, returns a preview of the rendered file tree without creating the repository",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;
}
