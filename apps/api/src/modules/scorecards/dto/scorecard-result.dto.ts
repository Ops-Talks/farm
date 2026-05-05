import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ScorecardLevel,
  ScorecardCategoryScores,
  ScorecardCriterionResult,
} from "../entities/scorecard-result.entity";

/**
 * Response DTO for a single ScorecardResult record.
 *
 * The optional fields (componentName, componentKind, componentLifecycle,
 * teamId) are populated by the overview/list endpoint that performs a JOIN
 * with the catalog component. They are absent from single-record responses
 * that return the raw scorecard data only.
 */
export class ScorecardResultDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Unique identifier of the scorecard result record",
  })
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "UUID of the evaluated component",
  })
  componentId: string;

  @ApiProperty({
    example: 82.5,
    description: "Weighted overall score in the 0-100 range",
  })
  overallScore: number;

  @ApiProperty({
    enum: ScorecardLevel,
    example: ScorecardLevel.SILVER,
    description: "Maturity level derived from the overall score",
  })
  level: ScorecardLevel;

  @ApiPropertyOptional({
    description: "Breakdown of scores per scorecard category",
    nullable: true,
  })
  categoryScores: ScorecardCategoryScores | null;

  @ApiPropertyOptional({
    description: "Individual criterion pass/fail results",
    nullable: true,
  })
  criteria: ScorecardCriterionResult[] | null;

  @ApiPropertyOptional({
    example: "2024-01-15T10:30:00Z",
    description: "Timestamp of when the evaluation was executed",
    nullable: true,
  })
  evaluatedAt: Date | null;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Record creation timestamp",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Record last-updated timestamp",
  })
  updatedAt: Date;

  // ---------------------------------------------------------------------------
  // Optional fields — populated only by the overview/list endpoint.
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: "user-service",
    description:
      "Human-readable name of the component (overview endpoint only)",
  })
  componentName?: string;

  @ApiPropertyOptional({
    example: "service",
    description: "Kind of the component (overview endpoint only)",
  })
  componentKind?: string;

  @ApiPropertyOptional({
    example: "production",
    description: "Lifecycle stage of the component (overview endpoint only)",
  })
  componentLifecycle?: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440050",
    description: "UUID of the owning team (overview endpoint only)",
    nullable: true,
  })
  teamId?: string | null;
}

/**
 * Summary of scorecard statistics for a single team.
 * Returned as part of the overview endpoint response.
 */
class ScorecardTeamSummaryDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440050",
    description: "UUID of the team",
  })
  teamId: string;

  @ApiProperty({
    example: "Platform Engineering",
    description: "Human-readable display name of the team",
  })
  teamName: string;

  @ApiProperty({
    example: 74.5,
    description:
      "Average overall score across all components owned by this team",
  })
  averageScore: number;

  @ApiProperty({
    example: 12,
    description: "Number of components owned by this team",
  })
  componentCount: number;
}

/**
 * Aggregated overview of scorecard health across all components.
 * Returned by the GET /scorecards/overview endpoint.
 */
export class ScorecardOverviewDto {
  @ApiProperty({
    example: 42,
    description: "Total number of components with a scorecard result",
  })
  totalComponents: number;

  @ApiProperty({
    example: 68.3,
    description: "Average overall score across all scored components",
  })
  averageScore: number;

  @ApiProperty({
    example: { none: 5, bronze: 10, silver: 15, gold: 8, platinum: 4 },
    description: "Count of components per maturity level",
  })
  levelDistribution: Record<string, number>;

  @ApiProperty({
    type: [ScorecardTeamSummaryDto],
    description: "Per-team scorecard aggregates",
  })
  byTeam: ScorecardTeamSummaryDto[];
}

/**
 * Request body for the POST /scorecards/components/:componentId/refresh endpoint.
 * The body is accepted for forward-compatibility but the organization scope is
 * always taken from the validated RequestWithOrg context (X-Organization-Id
 * header), never from client-supplied input.
 */
export class RefreshScorecardDto {}
