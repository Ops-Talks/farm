import { IsString, IsNotEmpty, IsOptional, IsObject } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for creating a new audit log entry.
 */
export class CreateAuditLogDto {
  @ApiProperty({
    example: "CREATE",
    description: "The action performed (e.g., CREATE, UPDATE, DELETE)",
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    example: "Component",
    description: "The type of resource affected (e.g., Component, Team, User)",
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The UUID of the affected resource",
  })
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "The ID of the user who performed the action, or 'system'",
  })
  @IsString()
  @IsNotEmpty()
  actorId: string;

  @ApiProperty({
    example: "jane_doe",
    description:
      "The username of the user who performed the action, or 'system'",
  })
  @IsString()
  @IsNotEmpty()
  actorUsername: string;

  @ApiProperty({
    example: { name: "my-service", lifecycle: "production" },
    description: "The changed data associated with the action",
    required: false,
    nullable: true,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
