import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

/**
 * Data transfer object for adding a new member to an organization.
 */
export class AddMemberDto {
  @ApiProperty({
    example: "john_doe",
    description: "The username of the user to add to the organization",
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({
    enum: OrgRole,
    example: OrgRole.MEMBER,
    description:
      "The role to assign to the new member. Defaults to MEMBER. The OWNER role cannot be assigned.",
  })
  @IsEnum(OrgRole)
  @IsOptional()
  role?: OrgRole;
}
