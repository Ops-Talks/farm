import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IncidentSeverity } from "../entities/incident.entity";

/**
 * DTO for creating a new incident.
 */
export class CreateIncidentDto {
  @ApiProperty({
    example: "Database connection pool exhaustion",
    description: "Short title summarizing the incident",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  title: string;

  @ApiPropertyOptional({
    example: "All PostgreSQL connections are saturated causing 503 errors",
    description: "Detailed description of the incident",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: IncidentSeverity,
    example: IncidentSeverity.P1,
    description: "Priority / severity of the incident",
  })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440099",
    description: "UUID of the user acting as incident commander",
  })
  @IsUUID()
  @IsOptional()
  commanderUserId?: string;

  @ApiPropertyOptional({
    example: ["550e8400-e29b-41d4-a716-446655440001"],
    description: "UUIDs of affected components",
  })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  affectedComponentIds?: string[];

  @ApiPropertyOptional({
    example: ["550e8400-e29b-41d4-a716-446655440010"],
    description: "UUIDs of affected environments",
  })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  affectedEnvironmentIds?: string[];

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this incident belongs to",
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
