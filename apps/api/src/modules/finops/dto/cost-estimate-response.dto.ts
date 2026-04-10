import { ApiProperty } from "@nestjs/swagger";

/**
 * Response DTO for a cost estimate record.
 */
export class CostEstimateResponseDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440400",
    description: "Unique identifier of the cost estimate",
  })
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID of the component this estimate belongs to",
  })
  componentId: string;

  @ApiProperty({
    example: "pipeline-run-uuid-1",
    description: "UUID of the pipeline run that produced this estimate",
    nullable: true,
  })
  pipelineRunId: string | null;

  @ApiProperty({
    example: 12.5,
    description: "Estimated total monthly cost",
  })
  estimatedMonthlyCost: number;

  @ApiProperty({
    example: 2.5,
    description: "Diff monthly cost compared to previous estimate",
  })
  diffMonthlyCost: number;

  @ApiProperty({
    example: "USD",
    description: "Currency code",
  })
  currency: string;

  @ApiProperty({
    description: "Detailed breakdown from infracost",
    nullable: true,
  })
  breakdown: Record<string, unknown> | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp at which the measurement was taken",
  })
  measuredAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "The creation date",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "The last update date",
  })
  updatedAt: Date;
}
