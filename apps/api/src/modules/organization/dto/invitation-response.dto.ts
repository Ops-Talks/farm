import { ApiProperty } from "@nestjs/swagger";
import { InvitationStatus } from "../entities/org-invitation.entity";

/**
 * Response shape for organization invitation resources.
 * The plain invitation token is intentionally excluded.
 */
export class InvitationResponseDto {
  @ApiProperty({ description: "Unique identifier of the invitation" })
  id: string;

  @ApiProperty({ description: "UUID of the organization" })
  organizationId: string;

  @ApiProperty({ description: "Email address of the invitee" })
  email: string;

  @ApiProperty({ description: "Role assigned upon acceptance" })
  role: string;

  @ApiProperty({
    enum: InvitationStatus,
    description: "Current invitation status",
  })
  status: InvitationStatus;

  @ApiProperty({ description: "Timestamp when the invitation expires" })
  expiresAt: Date;

  @ApiProperty({ description: "Timestamp when the invitation was created" })
  createdAt: Date;
}
