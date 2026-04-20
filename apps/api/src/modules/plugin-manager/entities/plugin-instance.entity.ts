import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Valid lifecycle statuses for a plugin installation.
 */
export enum PluginStatus {
  INSTALLING = "installing",
  ACTIVE = "active",
  DISABLED = "disabled",
  ERROR = "error",
}

/**
 * Health check result for a plugin instance.
 */
export enum PluginHealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNKNOWN = "unknown",
}

/**
 * Represents a plugin installed within a specific organization.
 * Tracks version, lifecycle status, health, and stored configuration.
 */
@Entity("plugin_instances")
export class PluginInstance {
  @ApiProperty({ description: "Unique identifier" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "Plugin manifest id, e.g. farm-plugin-slack" })
  @Index()
  @Column()
  pluginId: string;

  @ApiPropertyOptional({ description: "Organization this instance belongs to" })
  @Index()
  @Column({ nullable: true, type: "varchar" })
  orgId: string | null;

  @ApiProperty({ description: "Installed plugin version" })
  @Column()
  version: string;

  @ApiProperty({
    description: "Current lifecycle status",
    enum: PluginStatus,
    default: PluginStatus.INSTALLING,
  })
  @Column({
    type: "simple-enum",
    enum: PluginStatus,
    default: PluginStatus.INSTALLING,
  })
  status: PluginStatus;

  @ApiProperty({
    description: "Current health status",
    enum: PluginHealthStatus,
    default: PluginHealthStatus.UNKNOWN,
  })
  @Column({
    type: "simple-enum",
    enum: PluginHealthStatus,
    default: PluginHealthStatus.UNKNOWN,
  })
  healthStatus: PluginHealthStatus;

  @ApiPropertyOptional({
    description: "Plugin-specific configuration settings",
  })
  @Column("simple-json", { nullable: true })
  config: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: "Snapshot of the manifest at install time",
  })
  @Column("simple-json", { nullable: true })
  manifest: Record<string, unknown> | null;

  @ApiProperty({ description: "Timestamp when the plugin was installed" })
  @CreateDateColumn()
  installedAt: Date;

  @ApiProperty({ description: "Timestamp of the last update" })
  @UpdateDateColumn()
  updatedAt: Date;
}
