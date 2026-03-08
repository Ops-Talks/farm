import { IsEnum, IsOptional, IsObject, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { DeploymentStatus } from "../entities/deployment.entity";

/**
 * Data Transfer Object for updating a deployment status.
 */
export class UpdateDeploymentDto {
  @ApiProperty({
    enum: DeploymentStatus,
    example: DeploymentStatus.SUCCEEDED,
    description: "New deployment status",
    required: false,
  })
  @IsEnum(DeploymentStatus)
  @IsOptional()
  status?: DeploymentStatus;

  @ApiProperty({
    example: "2023-06-15T10:35:00Z",
    description: "When the deployment finished",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  finishedAt?: string;

  @ApiProperty({
    example: { duration: "5m" },
    description: "Additional metadata to merge",
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
