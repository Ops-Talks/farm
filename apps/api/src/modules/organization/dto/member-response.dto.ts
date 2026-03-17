import { ApiProperty } from "@nestjs/swagger";
import { OrgRole } from "@farm/types";

/**
 * Response shape for a single organization member.
 */
export class MemberResponseDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "The UUID of the user",
  })
  userId: string;

  @ApiProperty({
    example: "john_doe",
    description: "The username of the member",
  })
  username: string;

  @ApiProperty({
    example: "john@example.com",
    description: "The email address of the member",
  })
  email: string;

  @ApiProperty({
    enum: OrgRole,
    example: OrgRole.MEMBER,
    description: "The role of the member within the organization",
  })
  role: OrgRole;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The date the user joined the organization",
  })
  joinedAt: Date;
}
