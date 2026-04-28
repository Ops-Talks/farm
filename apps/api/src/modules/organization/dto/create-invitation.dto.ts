import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

/**
 * Payload to create a batch of organization invitations.
 * The OrgRolesGuard resolves the org context from `organizationId`.
 */
export class CreateInvitationDto {
  @ApiProperty({
    description: "Target organization id",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: "List of recipient email addresses (1-50)",
    example: ["alice@example.com", "bob@example.com"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({
    description: "Org role to assign upon acceptance",
    enum: OrgRole,
    example: OrgRole.MEMBER,
  })
  @IsEnum(OrgRole)
  role: OrgRole;

  @ApiPropertyOptional({
    description: "Optional message included in the invitation email",
    example: "Welcome to the team!",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  message?: string;
}
