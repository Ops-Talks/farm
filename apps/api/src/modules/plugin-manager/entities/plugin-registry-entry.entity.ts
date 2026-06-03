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
 * Represents a plugin entry in the community registry.
 * Stores the latest published manifest and tracks install count.
 */
@Entity("plugin_registry")
export class PluginRegistryEntry {
  @ApiProperty({ description: "Unique identifier" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: "Unique plugin identifier, e.g. farm-plugin-slack",
  })
  @Index({ unique: true })
  @Column({ unique: true })
  pluginId: string;

  @ApiProperty({ description: "Display name" })
  @Column()
  name: string;

  @ApiProperty({ description: "Latest published version" })
  @Column()
  latestVersion: string;

  @ApiProperty({ description: "Short description" })
  @Column()
  description: string;

  @ApiPropertyOptional({ description: "Author name" })
  @Column({ nullable: true, type: "varchar" })
  author: string | null;

  @ApiPropertyOptional({ description: "Plugin category for search filtering" })
  @Column({ nullable: true, type: "varchar" })
  category: string | null;

  @ApiProperty({
    description: "Full manifest snapshot at latest published version",
  })
  @Column({ type: "jsonb" })
  manifest: Record<string, unknown>;

  @ApiProperty({
    description: "Total number of times this plugin has been installed",
  })
  @Column({ default: 0 })
  installCount: number;

  @ApiProperty({ description: "Timestamp of first publish" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Timestamp of latest publish" })
  @UpdateDateColumn()
  updatedAt: Date;
}
