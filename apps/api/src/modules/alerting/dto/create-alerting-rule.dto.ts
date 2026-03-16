import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsUUID,
  Length,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { AlertingSeverity } from "../entities/alerting-rule.entity";

/**
 * DTO for creating a new alerting rule.
 */
export class CreateAlertingRuleDto {
  @ApiProperty({
    example: "high-error-rate",
    description: "Unique name for the alerting rule",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    example: "Fires when the HTTP error rate exceeds 5%",
    description: "Human-readable description of the rule",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "sum(rate(http_requests_total[5m])) > 0.05",
    description: "PromQL expression that defines the alert condition",
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    example: "5m",
    description:
      "Duration the condition must be true before the alert fires (e.g. 5m, 1h)",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+[smhd]$/, {
    message: "duration must be a valid duration string (e.g. 5m, 1h, 30s)",
  })
  duration: string;

  @ApiProperty({
    enum: AlertingSeverity,
    example: AlertingSeverity.WARNING,
    description: "Severity level of the alert",
  })
  @IsEnum(AlertingSeverity)
  severity: AlertingSeverity;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Optional component UUID this rule is scoped to",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Optional environment UUID this rule is scoped to",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  environmentId?: string;

  @ApiProperty({
    example: { team: "platform" },
    description: "Key-value label pairs",
    required: false,
  })
  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @ApiProperty({
    example: { summary: "High error rate detected" },
    description: "Key-value annotation pairs",
    required: false,
  })
  @IsObject()
  @IsOptional()
  annotations?: Record<string, string>;

  @ApiProperty({
    example: true,
    description: "Whether the rule is active",
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "Organization UUID this rule belongs to",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
