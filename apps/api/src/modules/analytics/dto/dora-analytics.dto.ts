import { ApiProperty } from "@nestjs/swagger";

/**
 * Deployment frequency metric for the DORA report.
 */
export class DeploymentFrequencyDto {
  @ApiProperty({
    example: 3.57,
    description:
      "Average number of successful deployments per day (rounded to 2 decimals)",
  })
  deploymentsPerDay: number;

  @ApiProperty({
    example: 100,
    description: "Total number of successful deployments in the period",
  })
  total: number;

  @ApiProperty({ example: 30, description: "Length of the period in days" })
  periodDays: number;
}

/**
 * Change failure rate metric for the DORA report.
 */
export class ChangeFailureRateDto {
  @ApiProperty({
    example: 5.2,
    description:
      "Percentage of deployments that resulted in failure (rounded to 1 decimal)",
  })
  rate: number;

  @ApiProperty({
    example: 6,
    description: "Number of failed or rolled-back deployments",
  })
  failed: number;

  @ApiProperty({
    example: 115,
    description:
      "Total deployments considered (SUCCEEDED + FAILED + ROLLED_BACK)",
  })
  total: number;
}

/**
 * Mean time to recovery metric for the DORA report.
 */
export class MeanTimeToRecoveryDto {
  @ApiProperty({
    example: 2.4,
    description:
      "Average hours from a failed deployment to the next successful deployment for the same component/environment pair (rounded to 1 decimal)",
  })
  avgHours: number;

  @ApiProperty({
    example: 6,
    description: "Number of recovery events used to compute the average",
  })
  samples: number;
}

/**
 * Lead time for changes metric for the DORA report.
 */
export class LeadTimeForChangesDto {
  @ApiProperty({
    example: 0.5,
    description:
      "Average hours between deployment start and finish for succeeded deployments (rounded to 1 decimal)",
  })
  avgHours: number;

  @ApiProperty({
    example: 87,
    description: "Number of deployments used to compute the average",
  })
  samples: number;
}

/**
 * Aggregated DORA metrics response for a given period.
 */
export class DoraAnalyticsDto {
  @ApiProperty({
    example: 30,
    description: "Length of the reporting period in days",
  })
  periodDays: number;

  @ApiProperty({
    type: DeploymentFrequencyDto,
    description: "Deployment frequency metrics",
  })
  deploymentFrequency: DeploymentFrequencyDto;

  @ApiProperty({
    type: ChangeFailureRateDto,
    description: "Change failure rate metrics",
  })
  changeFailureRate: ChangeFailureRateDto;

  @ApiProperty({
    type: MeanTimeToRecoveryDto,
    description: "Mean time to recovery metrics",
  })
  meanTimeToRecovery: MeanTimeToRecoveryDto;

  @ApiProperty({
    type: LeadTimeForChangesDto,
    description: "Lead time for changes metrics",
  })
  leadTimeForChanges: LeadTimeForChangesDto;
}
