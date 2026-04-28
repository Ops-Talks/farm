import { IsEnum, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

export class UpdateUserRoleDto {
  @ApiProperty({ description: "Organization id" })
  @IsUUID()
  orgId: string;

  @ApiProperty({ enum: OrgRole, description: "New org role" })
  @IsEnum(OrgRole)
  role: OrgRole;
}
