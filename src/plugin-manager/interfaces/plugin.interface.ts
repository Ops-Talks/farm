import { Type, DynamicModule, ForwardReference } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Metadata for a Farm plugin
 */
export class PluginMetadata {
  @ApiProperty({
    example: "github-actions",
    description: "The unique plugin name",
  })
  name: string;

  @ApiProperty({ example: "1.0.0", description: "The plugin version" })
  version: string;

  @ApiProperty({
    example: "Integrates GitHub Actions workflows",
    description: "A brief description of what the plugin does",
  })
  description: string;

  @ApiProperty({
    example: "Ops-Talks",
    description: "The plugin author",
    required: false,
  })
  author?: string;
}

/**
 * Base interface for Farm plugins
 * A plugin is essentially a NestJS module with additional metadata
 */
export interface FarmPlugin {
  metadata: PluginMetadata;
  module: Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference;
}
