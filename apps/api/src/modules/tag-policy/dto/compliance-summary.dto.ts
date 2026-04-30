import { ApiProperty } from "@nestjs/swagger";

/**
 * Per-provider or per-resource-type aggregated compliance statistics.
 */
class ComplianceBucketDto {
  @ApiProperty({ example: 42, description: "Total resources in this group" })
  total: number;

  @ApiProperty({
    example: 5,
    description: "Resources with at least one active violation",
  })
  violations: number;
}

/**
 * Aggregated compliance summary for an organization.
 * Returned by the GET /tag-policies/compliance-summary endpoint.
 */
export class ComplianceSummaryDto {
  @ApiProperty({
    example: 120,
    description: "Total number of resources discovered across all providers",
  })
  totalResources: number;

  @ApiProperty({
    example: 15,
    description: "Number of resources that have at least one active violation",
  })
  totalViolations: number;

  @ApiProperty({
    example: 87.5,
    description:
      "Percentage of resources that are fully compliant (0-100). Rounded to two decimal places.",
  })
  complianceRate: number;

  @ApiProperty({
    example: {
      aws: { total: 80, violations: 10 },
      gcp: { total: 40, violations: 5 },
    },
    description: "Compliance statistics broken down by cloud provider",
    type: "object",
    additionalProperties: {
      type: "object",
      properties: {
        total: { type: "number" },
        violations: { type: "number" },
      },
    },
  })
  byProvider: Record<string, ComplianceBucketDto>;

  @ApiProperty({
    example: { "ecs-service": { total: 50, violations: 8 } },
    description: "Compliance statistics broken down by resource type",
    type: "object",
    additionalProperties: {
      type: "object",
      properties: {
        total: { type: "number" },
        violations: { type: "number" },
      },
    },
  })
  byResourceType: Record<string, ComplianceBucketDto>;
}
