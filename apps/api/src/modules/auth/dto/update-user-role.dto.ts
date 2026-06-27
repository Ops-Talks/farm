import { IsEnum, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

export class UpdateUserRoleDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Organization id",
  })
  @IsUUID()
  orgId: string;

  @ApiProperty({
    enum: OrgRole,
    example: OrgRole.VIEWER,
    description: "New org role",
  })
  @IsEnum(OrgRole)
  role: OrgRole;
}
