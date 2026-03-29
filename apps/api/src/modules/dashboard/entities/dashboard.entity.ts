import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { DashboardWidget } from "./dashboard-widget.entity";

/**
 * Visibility levels for dashboards.
 */
export enum DashboardVisibility {
  PRIVATE = "private",
  WORKSPACE = "workspace",
}

/**
 * Represents a custom dashboard that organizes widgets for monitoring
 * and observability views.
 */
@Entity("dashboards")
export class Dashboard {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "Production Overview",
    description: "Display name for the dashboard",
  })
  @Column()
  name: string;

  @ApiProperty({
    example: "High-level production health metrics",
    description: "Optional description of the dashboard",
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "UUID of the user who created this dashboard",
  })
  @Column()
  ownerId: string;

  @ApiProperty({
    enum: DashboardVisibility,
    example: DashboardVisibility.PRIVATE,
    description: "Visibility scope of the dashboard",
    default: DashboardVisibility.PRIVATE,
  })
  @Column({ default: DashboardVisibility.PRIVATE })
  visibility: DashboardVisibility;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this dashboard belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true })
  organizationId: string;

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

  @ApiProperty({
    type: () => [DashboardWidget],
    description: "Widgets placed on this dashboard",
  })
  @OneToMany(() => DashboardWidget, (widget) => widget.dashboard, {
    cascade: true,
  })
  widgets: DashboardWidget[];
}
