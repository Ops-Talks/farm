import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
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
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: {
          type: "string",
          enum: [
            "script",
            "approval",
            "deploy",
            "notify",
            "build",
            "infracost",
          ],
        },
        config: { type: "object", additionalProperties: true },
        order: { type: "number" },
        backend: {
          type: "object",
          nullable: true,
          properties: {
            provider: {
              type: "string",
              enum: ["github-actions", "argocd", "jenkins", "circleci"],
            },
            ref: { type: "string", nullable: true },
            workflowId: { type: "string", nullable: true },
            appName: { type: "string", nullable: true },
            jobName: { type: "string", nullable: true },
            componentId: { type: "string", nullable: true },
            environmentId: { type: "string", nullable: true },
          },
        },
      },
      required: ["id", "name", "type", "config", "order"],
    },
  })
  @IsArray()
  @IsOptional()
  stages?: PipelineStage[];

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Optional component UUID this pipeline is bound to",
  })
  @IsUUID()
  @IsOptional()
  componentId?: string;
}
