import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUrl,
  IsISO8601,
  IsNumber,
  ValidateNested,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IacRunType, IacRunStatus } from "../entities/iac-run.entity";

/**
 * Nested DTO for the resource change summary in an IaC run report.
 */
export class ResourceChangesDto {
  @ApiProperty({ example: 2, description: "Resources to be added" })
  @IsInt()
  @Min(0)
  add: number;

  @ApiProperty({ example: 1, description: "Resources to be changed" })
  @IsInt()
  @Min(0)
  change: number;

  @ApiProperty({ example: 0, description: "Resources to be destroyed" })
  @IsInt()
  @Min(0)
  destroy: number;
}

/**
 * Payload submitted by Cultivator (or any CI agent) to record a completed
 * Terraform/OpenTofu plan or apply operation.
 */
export class IngestRunDto {
  @ApiProperty({
    example: "core-networking",
    description: "Name of the stack this run belongs to",
  })
  @IsString()
  @IsNotEmpty()
  stackName: string;

  @ApiProperty({
    example: "production",
    description: "Target environment for the run",
  })
  @IsString()
  @IsNotEmpty()
  environment: string;

  @ApiPropertyOptional({
    example: "terraform",
    description: "IaC provider used (terraform / opentofu)",
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    enum: IacRunType,
    example: IacRunType.PLAN,
    description: "Run type: plan or apply",
  })
  @IsEnum(IacRunType)
  type: IacRunType;

  @ApiProperty({
    enum: IacRunStatus,
    example: IacRunStatus.SUCCEEDED,
    description: "Terminal status of the run",
  })
  @IsEnum(IacRunStatus)
  status: IacRunStatus;

  @ApiPropertyOptional({
    type: ResourceChangesDto,
    description: "Resource change counts from the plan/apply output",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceChangesDto)
  resourceChanges?: ResourceChangesDto;

  @ApiPropertyOptional({
    example: "github-actions-bot",
    description: "Actor username or CI system that triggered the run",
  })
  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @ApiPropertyOptional({
    example: "https://github.com/acme/infra/actions/runs/12345",
    description: "URL to the CI pipeline execution",
  })
  @IsOptional()
  @IsUrl()
  pipelineUrl?: string;

  @ApiPropertyOptional({
    example: "2024-01-01T10:00:00Z",
    description: "ISO 8601 timestamp when the run started",
  })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({
    example: "2024-01-01T10:03:45Z",
    description: "ISO 8601 timestamp when the run finished",
  })
  @IsOptional()
  @IsISO8601()
  finishedAt?: string;

  @ApiPropertyOptional({
    example: 225000,
    description: "Total run duration in milliseconds",
  })
  @IsOptional()
  @IsNumber()
  durationMs?: number;
}
