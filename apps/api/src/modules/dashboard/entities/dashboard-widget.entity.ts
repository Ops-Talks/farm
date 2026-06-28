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
import { ApiProperty } from "@nestjs/swagger";
import { Dashboard } from "./dashboard.entity";

/**
 * Supported widget types for dashboards.
 */
export enum WidgetType {
  METRIC_GRAPH = "metric_graph",
  COMPONENT_HEALTH = "component_health",
  DEPLOYMENT_FEED = "deployment_feed",
  QUEUE_STATUS = "queue_status",
  SLO_GAUGE = "slo_gauge",
  ALERT_SUMMARY = "alert_summary",
  TEAM_ACTIVITY = "team_activity",
  UPTIME_CHART = "uptime_chart",
}

/**
 * Represents a single widget placed on a dashboard with grid layout
 * coordinates and widget-specific configuration.
 */
@Entity("dashboard_widgets")
export class DashboardWidget {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID of the parent dashboard",
  })
  @Index()
  @Column()
  dashboardId: string;

  @ApiProperty({
    enum: WidgetType,
    example: WidgetType.METRIC_GRAPH,
    description: "Type of widget to render",
  })
  @Column()
  type: WidgetType;

  @ApiProperty({
    example: "Request Latency P99",
    description: "Display title for the widget",
  })
  @Column()
  title: string;

  @ApiProperty({
    example: 0,
    description: "Horizontal grid position (column)",
    default: 0,
  })
  @Column({ type: "integer", default: 0 })
  gridX: number;

  @ApiProperty({
    example: 0,
    description: "Vertical grid position (row)",
    default: 0,
  })
  @Column({ type: "integer", default: 0 })
  gridY: number;

  @ApiProperty({
    example: 4,
    description: "Widget width in grid units",
    default: 4,
  })
  @Column({ type: "integer", default: 4 })
  gridW: number;

  @ApiProperty({
    example: 3,
    description: "Widget height in grid units",
    default: 3,
  })
  @Column({ type: "integer", default: 3 })
  gridH: number;

  @ApiProperty({
    example: { metricName: "http_request_duration_seconds", range: "1h" },
    description: "Widget-specific configuration object",
    required: false,
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  config: Record<string, unknown>;

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

  @ManyToOne(() => Dashboard, (dashboard) => dashboard.widgets, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dashboard_id" })
  dashboard: Dashboard;
}
