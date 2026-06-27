import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";

/**
 * Links an Elasticsearch index pattern to a catalog component.
 * Created as part of FARM-T401 (Phase 35 - Elasticsearch Index Visibility).
 *
 * Multiple records may exist for a single component, but the
 * combination (componentId, indexPattern) is unique.
 */
@Entity("component_elasticsearch_indices")
@Index(
  "UQ_component_es_indices_componentId_indexPattern",
  ["componentId", "indexPattern"],
  { unique: true },
)
export class ComponentElasticsearchIndex {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "FK to the owning catalog component",
  })
  @Index()
  @Column({ type: "uuid" })
  componentId: string;

  /**
   * Owning catalog component. Populated when callers explicitly request the
   * relation (e.g. the admin overview endpoint, FARM-T407). Not eagerly
   * loaded to keep per-component queries cheap.
   */
  @ManyToOne(() => Component, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component?: Component;

  @ApiProperty({
    example: "logs-app-*",
    description: "Elasticsearch index name or pattern (e.g. logs-app-*)",
    maxLength: 255,
  })
  @Column({ type: "varchar", length: 255 })
  indexPattern: string;

  @ApiPropertyOptional({
    example: "https://es.example.com:9200",
    description:
      "Optional Elasticsearch URL overriding the global ELASTICSEARCH_URL env var",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  esUrl: string | null;

  @ApiPropertyOptional({
    example: "Application JSON logs",
    description: "Free-form description of the linked index",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization this record belongs to (multi-tenancy)",
    nullable: true,
  })
  @Index()
  @Column({ type: "varchar", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
