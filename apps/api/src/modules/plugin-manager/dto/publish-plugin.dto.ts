import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Request body for publishing a plugin manifest to the community registry.
 */
export class PublishPluginDto {
  @ApiProperty({ description: "Unique plugin identifier", example: "farm-plugin-slack" })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: "Display name", example: "Slack Integration" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Semantic version", example: "1.0.0" })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ description: "Short description" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: "Author name" })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: "SPDX license identifier", example: "MIT" })
  @IsString()
  @IsOptional()
  license?: string;

  @ApiPropertyOptional({
    description: "Minimum Farm version required",
    example: "0.17.0",
  })
  @IsString()
  @IsOptional()
  farmMinVersion?: string;

  @ApiProperty({
    description: "URL or npm package identifier for the plugin entry module",
    example: "https://cdn.example.com/plugin/1.0.0/index.js",
  })
  @IsString()
  @IsNotEmpty()
  entryPoint: string;

  @ApiPropertyOptional({
    description: "Permission scopes required by the plugin",
    example: ["catalog:read"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({
    description: "Plugin IDs this plugin depends on",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependsOn?: string[];

  @ApiPropertyOptional({ description: "Plugin category for search filtering" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: "JSON Schema for plugin-specific configuration" })
  @IsObject()
  @IsOptional()
  settingsSchema?: Record<string, unknown>;
}
