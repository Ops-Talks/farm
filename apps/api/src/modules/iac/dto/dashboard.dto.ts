import { ApiProperty } from "@nestjs/swagger";
import type { IacRunStatus, IacRunType } from "../entities/iac-run.entity";

/**
 * Summary of a single IaC stack shown on the dashboard.
 */
export class StackSummaryDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  stackId: string;

  @ApiProperty({ example: "core-networking" })
  name: string;

  @ApiProperty({ example: "succeeded", nullable: true })
  lastRunStatus: IacRunStatus | null;

  @ApiProperty({ example: "2024-01-01T10:03:45Z", nullable: true })
  lastRunAt: Date | null;

  @ApiProperty({ example: "apply", nullable: true })
  lastRunType: IacRunType | null;

  @ApiProperty({
    example: { add: 2, change: 1, destroy: 0 },
    nullable: true,
  })
  resourceChanges: { add: number; change: number; destroy: number } | null;

  @ApiProperty({ example: false })
  autoImported: boolean;

  @ApiProperty({ example: "terraform" })
  provider: string;

  @ApiProperty({
    example: "https://app.terraform.io/app/acme/workspaces/core-networking",
    nullable: true,
  })
  externalToolUrl: string | null;
}

/**
 * Top-level IaC dashboard response.
 */
export class DashboardDto {
  @ApiProperty({ example: 12, description: "Total number of IaC stacks" })
  totalStacks: number;

  @ApiProperty({
    example: 2,
    description: "Number of stacks with a failed last run",
  })
  failedLastRun: number;

  @ApiProperty({
    example: ["production", "staging"],
    description: "Distinct deployment environments",
  })
  environments: string[];

  @ApiProperty({
    description:
      "Stacks grouped by environment. Failed stacks appear first within each group.",
    type: "object",
    additionalProperties: {
      type: "array",
      items: { $ref: "#/components/schemas/StackSummaryDto" },
    },
  })
  stacksByEnvironment: Record<string, StackSummaryDto[]>;
}
