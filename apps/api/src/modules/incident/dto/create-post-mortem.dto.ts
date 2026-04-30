import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

/**
 * Nested DTO representing a single post-mortem action item.
 */
class ActionItemDto {
  @ApiProperty({
    example: "Add connection pool alerts",
    description: "Title of the action item",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: "john",
    description: "Person or team assigned to the action item",
  })
  @IsString()
  @IsOptional()
  assignee?: string;

  @ApiProperty({
    example: false,
    description: "Whether the action item has been completed",
  })
  @IsBoolean()
  done: boolean;
}

/**
 * DTO for creating a new post-mortem linked to an incident.
 */
export class CreatePostMortemDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "UUID of the incident this post-mortem is for",
  })
  @IsUUID()
  incidentId: string;

  @ApiProperty({
    example: "Connection pool max size was set to 5 instead of 50",
    description: "Root cause of the incident",
  })
  @IsString()
  @IsNotEmpty()
  rootCause: string;

  @ApiPropertyOptional({
    example: ["Missing connection pool monitoring", "No autoscaling"],
    description: "Factors that contributed to the incident",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contributingFactors?: string[];

  @ApiPropertyOptional({
    type: [ActionItemDto],
    description: "Follow-up action items",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionItemDto)
  @IsOptional()
  actionItems?: ActionItemDto[];

  @ApiPropertyOptional({
    example: "## Summary\nFull post-mortem write-up in Markdown...",
    description: "Full post-mortem body in Markdown format",
  })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this post-mortem belongs to",
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
