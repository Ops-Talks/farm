import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

/**
 * Data transfer object for admin-initiated user creation (Phase 56).
 */
export class AdminCreateUserDto {
  @ApiProperty({
    example: "jane_doe",
    description:
      "Unique username (2-50 characters, alphanumeric with _ and - allowed).",
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Username can only contain letters, numbers, underscores, and hyphens",
  })
  username: string;

  @ApiProperty({
    example: "jane@example.com",
    description: "User email address.",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "Jane Doe",
    description: "Full display name.",
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({
    example: "TempPass1!",
    description:
      "Initial password (min 8 characters). Omit to auto-generate a 12-character temporary password.",
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description:
      "Organization UUID. When provided, the new user is automatically enrolled into this organization.",
  })
  @IsOptional()
  @IsUUID()
  orgId?: string;

  @ApiPropertyOptional({
    enum: OrgRole,
    example: OrgRole.VIEWER,
    description:
      "Org role to assign when orgId is provided. Defaults to VIEWER.",
  })
  @IsOptional()
  @IsEnum(OrgRole)
  orgRole?: OrgRole;

  @ApiPropertyOptional({
    example: false,
    description:
      "Grant the platform admin role. Only platform admins can set this to true.",
  })
  @IsOptional()
  @IsBoolean()
  platformAdmin?: boolean;
}
