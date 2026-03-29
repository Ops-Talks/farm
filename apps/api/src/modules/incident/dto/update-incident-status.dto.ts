import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IncidentStatus } from "../entities/incident.entity";

/**
 * DTO for transitioning an incident to a new status.
 */
export class UpdateIncidentStatusDto {
  @ApiProperty({
    enum: IncidentStatus,
    example: IncidentStatus.INVESTIGATING,
    description: "The target status for the incident",
  })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiPropertyOptional({
    example: "Starting investigation of connection pool saturation",
    description: "Optional message to include in the timeline entry",
  })
  @IsString()
  @IsOptional()
  message?: string;
}
