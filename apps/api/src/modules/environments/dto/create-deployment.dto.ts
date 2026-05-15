import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for creating a new deployment record.
 */
export class CreateDeploymentDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The ID of the component being deployed",
  })
  @IsUUID()
  @IsNotEmpty()
  componentId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "The ID of the target environment",
  })
  @IsUUID()
  @IsNotEmpty()
  environmentId: string;

  @ApiProperty({
    example: "v2.3.1",
    description: "The version being deployed",
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({
    example: "ci-bot",
    description: "Username or system that triggered the deployment",
    required: false,
  })
  @IsString()
  @IsOptional()
  deployedBy?: string;

  @ApiProperty({
    example: "a1b2c3d4e5f6",
    description: "Git commit SHA",
    required: false,
  })
  @IsString()
  @IsOptional()
  commitSha?: string;

  @ApiProperty({
    example: "Hotfix for login timeout issue",
    description: "Deployment description or notes",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: { pipelineUrl: "https://ci.example.com/runs/123" },
    description: "Additional metadata",
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440300",
    description: "UUID of the pipeline run that triggered this deployment",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  pipelineRunId?: string;
}
