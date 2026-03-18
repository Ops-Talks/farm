import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { PipelineRunStatus } from "../entities/pipeline-run.entity";

/**
 * Query parameters for listing pipeline runs with optional status filter and pagination.
 */
export class ListRunsQueryDto {
  @ApiPropertyOptional({
    description: "Number of records to skip",
    default: 0,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: "Number of records to return",
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @ApiPropertyOptional({
    enum: PipelineRunStatus,
    description: "Filter runs by execution status",
    example: PipelineRunStatus.SUCCEEDED,
  })
  @IsOptional()
  @IsEnum(PipelineRunStatus)
  status?: PipelineRunStatus;
}
