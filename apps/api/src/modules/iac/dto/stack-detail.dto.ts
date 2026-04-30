import { ApiProperty } from "@nestjs/swagger";
import { IacRunStatus, IacRunType } from "../entities/iac-run.entity";

/**
 * Minimal last-run summary embedded inside StackDetailDto.
 * Only the fields needed for UI display are included.
 */
class LastRunSummaryDto {
  @ApiProperty({ example: "run-uuid-1" })
  id: string;

  @ApiProperty({ enum: IacRunStatus, example: IacRunStatus.SUCCEEDED })
  status: IacRunStatus;

  @ApiProperty({ enum: IacRunType, example: IacRunType.PLAN })
  type: IacRunType;

  @ApiProperty({
    example: "2024-01-01T10:00:00Z",
    nullable: true,
  })
  startedAt: Date | null;
}

/**
 * Full stack detail response, including the most recent run summary.
 * Returned by GET /iac/stacks and GET /iac/stacks/:id.
 */
export class StackDetailDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "core-networking" })
  name: string;

  @ApiProperty({ example: "production" })
  environment: string;

  @ApiProperty({ example: "terraform" })
  provider: string;

  @ApiProperty({
    example: "https://github.com/acme/infra",
    nullable: true,
  })
  repositoryUrl: string | null;

  @ApiProperty({ example: "stacks/core-networking", nullable: true })
  basePath: string | null;

  @ApiProperty({
    example: "https://app.terraform.io/app/acme/workspaces/core-networking",
    nullable: true,
  })
  externalToolUrl: string | null;

  @ApiProperty({ example: "comp-uuid-1234", nullable: true })
  componentId: string | null;

  @ApiProperty({ example: false })
  autoImported: boolean;

  @ApiProperty({ nullable: true, type: () => LastRunSummaryDto })
  lastRun: LastRunSummaryDto | null;

  @ApiProperty({ example: "2024-01-01T00:00:00Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-01T00:00:00Z" })
  updatedAt: Date;
}
