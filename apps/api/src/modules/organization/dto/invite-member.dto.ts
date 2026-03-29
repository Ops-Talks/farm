import { IsEmail, IsIn, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

/**
 * Data transfer object for inviting a new member to an organization via email.
 */
export class InviteMemberDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email address of the invitee",
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: [OrgRole.MEMBER, OrgRole.ADMIN],
    default: OrgRole.MEMBER,
    description: "Role to assign upon invitation acceptance",
  })
  @IsOptional()
  @IsIn([OrgRole.MEMBER, OrgRole.ADMIN])
  role?: OrgRole;
}
