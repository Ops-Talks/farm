import { IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

/**
 * Data transfer object for updating the role of an existing organization member.
 */
export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: OrgRole,
    example: OrgRole.ADMIN,
    description:
      "The new role to assign to the member. The OWNER role is immutable and cannot be set.",
  })
  @IsEnum(OrgRole)
  @IsNotEmpty()
  role: OrgRole;
}
