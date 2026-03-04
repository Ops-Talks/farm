import { Type, DynamicModule, ForwardReference } from "@nestjs/common";

/**
 * Metadata for a Farm plugin
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
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
