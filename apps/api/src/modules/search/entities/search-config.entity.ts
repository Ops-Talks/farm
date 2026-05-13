import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Stores per-organization (or global) boost weights and fuzziness settings
 * that control how advanced search queries are executed against Elasticsearch.
 *
 * A row with organizationId = NULL acts as the global default.
 * A row with a non-null organizationId overrides those defaults for that org.
 */
@Entity("search_configs")
export class SearchConfig {
  @ApiProperty({ description: "Auto-generated UUID primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** null = global default, non-null = org-specific override. */
  @ApiProperty({
    description:
      "Organization UUID for org-specific config; null for global default",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  organizationId: string | null;

  /** Boost weight applied to the title field in Elasticsearch queries. */
  @ApiProperty({
    description:
      "Boost weight applied to the title field in Elasticsearch queries",
    default: 3,
  })
  @Column({ type: "float", default: 3 })
  titleBoost: number;

  /** Boost weight applied to the tags field in Elasticsearch queries. */
  @ApiProperty({
    description:
      "Boost weight applied to the tags field in Elasticsearch queries",
    default: 2,
  })
  @Column({ type: "float", default: 2 })
  tagsBoost: number;

  /** Boost weight applied to the description field in Elasticsearch queries. */
  @ApiProperty({
    description:
      "Boost weight applied to the description field in Elasticsearch queries",
    default: 1,
  })
  @Column({ type: "float", default: 1 })
  descriptionBoost: number;

  /**
   * Elasticsearch fuzziness value controlling typo tolerance.
   * Accepts 'AUTO', '0', '1', or '2'.
   */
  @ApiProperty({
    description: "Elasticsearch fuzziness value — 'AUTO', '0', '1', or '2'",
    default: "AUTO",
    example: "AUTO",
  })
  @Column({ default: "AUTO" })
  fuzziness: string;

  @ApiProperty({ description: "Row creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Row last-update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;
}
