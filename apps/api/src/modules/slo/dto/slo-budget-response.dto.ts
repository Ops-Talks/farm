import { ApiProperty } from "@nestjs/swagger";

/**
 * Status of the SLO error budget.
 */
export enum SloBudgetStatus {
  HEALTHY = "healthy",
  WARNING = "warning",
  CRITICAL = "critical",
  EXHAUSTED = "exhausted",
}

/**
 * Response DTO representing the current SLO error budget status.
 */
export class SloBudgetResponseDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "ID of the SLO",
  })
  sloId: string;

  @ApiProperty({
    example: "api-availability",
    description: "Name of the SLO",
  })
  name: string;

  @ApiProperty({
    example: 99.95,
    description: "Target percentage defined in the SLO",
  })
  targetPercent: number;

  @ApiProperty({
    example: 99.98,
    description: "Current measured percentage for the metric",
  })
  currentPercent: number;

  @ApiProperty({
    example: 0.05,
    description:
      "Total error budget in percentage points (100 - targetPercent)",
  })
  budgetTotal: number;

  @ApiProperty({
    example: 0.03,
    description: "Error budget consumed so far in percentage points",
  })
  budgetConsumed: number;

  @ApiProperty({
    example: 40.0,
    description:
      "Percentage of the error budget still remaining (0-100 scale where 100 means no budget has been consumed)",
  })
  budgetRemaining: number;

  @ApiProperty({
    example: 0.45,
    description:
      "Rate at which the error budget is being consumed relative to the elapsed window fraction",
  })
  burnRate: number;

  @ApiProperty({
    enum: SloBudgetStatus,
    example: SloBudgetStatus.HEALTHY,
    description: "Overall budget health status",
  })
  status: SloBudgetStatus;

  @ApiProperty({
    example: "2024-01-01T00:00:00.000Z",
    description: "Start of the evaluation window (ISO 8601)",
  })
  windowStart: string;

  @ApiProperty({
    example: "2024-01-31T00:00:00.000Z",
    description: "End of the evaluation window (ISO 8601)",
  })
  windowEnd: string;
}
