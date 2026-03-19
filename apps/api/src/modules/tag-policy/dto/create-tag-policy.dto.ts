import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a new tag governance policy.
 */
export class CreateTagPolicyDto {
  @ApiProperty({
    example: "org-uuid-1",
    description: "Organization UUID this policy belongs to",
  })
  @IsString()
  @IsNotEmpty()
  orgId: string;

  @ApiProperty({
    example: "ecs-service",
    description:
      'Resource type the policy applies to. Use "*" to match all types.',
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    example: ["env", "team", "owner"],
    description: "Tag keys that must be present on every matching resource",
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requiredKeys: string[];

  @ApiPropertyOptional({
    example: "warning",
    description:
      'Enforcement severity. "warning" records a violation; "error" denotes a hard violation.',
    enum: ["warning", "error"],
    default: "warning",
  })
  @IsOptional()
  @IsEnum(["warning", "error"] as const)
  severity?: "warning" | "error";
}
