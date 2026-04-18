import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Stores per-organization (or global) boost weights and fuzziness settings
 * that control how advanced search queries are executed against Elasticsearch.
 *
 * A row with organizationId = NULL acts as the global default.
 * A row with a non-null organizationId overrides those defaults for that org.
 */
@Entity("search_configs")
export class SearchConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** null = global default, non-null = org-specific override. */
  @Column({ type: "varchar", nullable: true })
  organizationId: string | null;

  /** Boost weight applied to the title field in Elasticsearch queries. */
  @Column({ type: "float", default: 3 })
  titleBoost: number;

  /** Boost weight applied to the tags field in Elasticsearch queries. */
  @Column({ type: "float", default: 2 })
  tagsBoost: number;

  /** Boost weight applied to the description field in Elasticsearch queries. */
  @Column({ type: "float", default: 1 })
  descriptionBoost: number;

  /**
   * Elasticsearch fuzziness value controlling typo tolerance.
   * Accepts 'AUTO', '0', '1', or '2'.
   */
  @Column({ default: "AUTO" })
  fuzziness: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
