import { ApiProperty } from "@nestjs/swagger";

/**
 * A component ranked by number of audit-log accesses.
 */
export class TopComponentDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The component resource ID referenced in the audit log",
  })
  componentId: string;

  @ApiProperty({
    example: "payment-service",
    description:
      "The component name (empty string when the component has been deleted)",
  })
  componentName: string;

  @ApiProperty({
    example: 142,
    description: "Number of audit-log events for this component in the period",
  })
  accessCount: number;
}

/**
 * A user ranked by number of audit-log actions.
 */
export class ActiveUserDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "The actor user ID",
  })
  actorId: string;

  @ApiProperty({ example: "jane_doe", description: "The actor username" })
  actorUsername: string;

  @ApiProperty({
    example: 57,
    description: "Number of actions performed by this user in the period",
  })
  actionCount: number;
}

/**
 * Audit-log event count grouped by action type.
 */
export class ActionBreakdownDto {
  @ApiProperty({
    example: "CREATE",
    description: "The action type (e.g., CREATE, UPDATE, DELETE)",
  })
  action: string;

  @ApiProperty({
    example: 34,
    description: "Number of audit-log events of this action type",
  })
  count: number;
}

/**
 * Aggregated platform usage analytics response.
 */
export class UsageAnalyticsDto {
  @ApiProperty({
    example: 30,
    description: "Length of the reporting period in days",
  })
  periodDays: number;

  @ApiProperty({
    example: 1024,
    description: "Total number of audit-log events in the period",
  })
  totalAuditEvents: number;

  @ApiProperty({
    type: [TopComponentDto],
    description: "Top 10 most accessed components in the period",
  })
  topComponents: TopComponentDto[];

  @ApiProperty({
    type: [ActiveUserDto],
    description: "Top 10 most active users in the period",
  })
  activeUsers: ActiveUserDto[];

  @ApiProperty({
    type: [ActionBreakdownDto],
    description: "Breakdown of audit-log events by action type",
  })
  actionBreakdown: ActionBreakdownDto[];
}
