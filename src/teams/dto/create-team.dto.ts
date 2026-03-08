import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  IsObject,
  Length,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { TeamType } from "../entities/team.entity";

/**
 * DTO for creating a new team.
 */
export class CreateTeamDto {
  @ApiProperty({
    example: "platform-team",
    description: "Unique team identifier (slug)",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @ApiProperty({
    example: "Platform Engineering",
    description: "Human-readable team name",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  displayName: string;

  @ApiProperty({
    example: "Responsible for internal platform services",
    description: "Team description",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: TeamType,
    example: TeamType.PLATFORM,
    description: "The domain focus of the team",
  })
  @IsEnum(TeamType)
  type: TeamType;

  @ApiProperty({
    example: "platform-team@example.com",
    description: "Team contact email",
    required: false,
  })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({
    example: "#platform-team",
    description: "Slack channel for the team",
    required: false,
  })
  @IsString()
  @IsOptional()
  slackChannel?: string;

  @ApiProperty({
    example: { oncallRotation: "https://pagerduty.com/team/platform" },
    description: "Additional metadata",
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
