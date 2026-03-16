import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PipelineStage } from "../entities/pipeline.entity";

/**
 * DTO for creating a new pipeline definition.
 */
export class CreatePipelineDto {
  @ApiProperty({
    example: "deploy-to-production",
    description: "Unique pipeline name",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({
    example: "Deploys the main service to production after approval",
    description: "Human-readable pipeline description",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Ordered list of pipeline stages",
    type: "array",
    items: { type: "object" },
  })
  @IsArray()
  @IsOptional()
  stages?: PipelineStage[];
}
