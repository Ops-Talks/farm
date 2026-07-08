import { ApiProperty } from "@nestjs/swagger";
import { IacRunStatus, IacRunType } from "../entities/iac-run.entity";

/**
 * Minimal last-run summary embedded inside StackDetailDto.
 * Only the fields needed for UI display are included.
 */
class LastRunSummaryDto {
  @ApiProperty({ example: "run-uuid-1", description: "Unique run identifier" })
  id: string;

  @ApiProperty({
    enum: IacRunStatus,
    example: IacRunStatus.SUCCEEDED,
    description: "Run status",
  })
  status: IacRunStatus;

  @ApiProperty({
    enum: IacRunType,
    example: IacRunType.PLAN,
    description: "Run type",
  })
  type: IacRunType;

  @ApiProperty({
    example: "2024-01-01T10:00:00Z",
    nullable: true,
    description: "Timestamp when the run started",
  })
  startedAt: Date | null;
}

/**
 * Full stack detail response, including the most recent run summary.
 * Returned by GET /iac/stacks and GET /iac/stacks/:id.
 */
export class StackDetailDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique stack identifier",
  })
  id: string;

  @ApiProperty({
    example: "core-networking",
    description: "Stack display name",
  })
  name: string;

  @ApiProperty({ example: "production", description: "Deployment environment" })
  environment: string;

  @ApiProperty({ example: "terraform", description: "IaC provider type" })
  provider: string;

  @ApiProperty({
    example: "https://github.com/acme/infra",
    nullable: true,
    description: "URL of the source repository",
  })
  repositoryUrl: string | null;

  @ApiProperty({
    example: "stacks/core-networking",
    nullable: true,
    description: "Path within the repository",
  })
  basePath: string | null;

  @ApiProperty({
    example: "https://app.terraform.io/app/acme/workspaces/core-networking",
    nullable: true,
    description: "URL to the external IaC tool workspace",
  })
  externalToolUrl: string | null;

  @ApiProperty({
    example: "comp-uuid-1234",
    nullable: true,
    description: "ID of the linked component",
  })
  componentId: string | null;

  @ApiProperty({
    example: false,
    description: "Whether the stack was auto-imported",
  })
  autoImported: boolean;

  @ApiProperty({
    nullable: true,
    type: () => LastRunSummaryDto,
    description: "Summary of the most recent run",
  })
  lastRun: LastRunSummaryDto | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp when the stack was created",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp when the stack was last updated",
  })
  updatedAt: Date;
}
