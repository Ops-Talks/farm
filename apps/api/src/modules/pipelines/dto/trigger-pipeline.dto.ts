import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for triggering a pipeline run.
 * The pipelineId from the route param is used by default; this field
 * is kept for future override scenarios.
 */
export class TriggerPipelineDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440200",
    description: "Optional override of the pipeline ID to trigger",
  })
  @IsOptional()
  @IsString()
  pipelineId?: string;
}
