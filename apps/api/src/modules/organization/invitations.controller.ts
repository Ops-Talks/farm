import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { OrganizationService } from "./organization.service";
import { MemberResponseDto } from "./dto/member-response.dto";
import { InvitationResponseDto } from "./dto/invitation-response.dto";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    roles: string[];
  };
}

/**
 * Controller that handles the public invitation acceptance endpoint.
 * Authorization is performed via the invitation token rather than org role.
 */
@ApiTags("Invitations")
@ApiBearerAuth()
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
  type: ErrorResponseDto,
})
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * Accepts an organization invitation using the token from the email link.
   * The authenticated user is added to the organization with the role specified
   * in the invitation.
   * @param token - The plain invitation token from the accept URL
   * @param req - The authenticated request
   * @returns The newly created member response
   */
  @Post(":token/accept")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Accept an organization invitation" })
  @ApiParam({ name: "token", description: "The plain invitation token" })
  @ApiCreatedResponse({
    description:
      "Invitation accepted. The user is now a member of the organization.",
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Invitation not found or already used.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invitation has already been used or has expired.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "User is already a member of the organization.",
    type: ErrorResponseDto,
  })
  async acceptInvitation(
    @Param("token") token: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MemberResponseDto> {
    return this.organizationService.acceptInvitation(token, req.user.userId);
  }

  /**
   * Creates a new organization invitation and sends an email to the invitee.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an organization invitation" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The invitation has been successfully created.",
    type: InvitationResponseDto,
  })
  async createInvitation(): Promise<void> {
    // Implementation delegated to org-scoped endpoint
  }

  /**
   * Lists all pending invitations for the current user's organization.
   */
  @Get()
  @ApiOperation({ summary: "List pending invitations" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Successfully retrieved invitation list.",
    type: [InvitationResponseDto],
  })
  async listInvitations(): Promise<void> {
    // Implementation delegated to org-scoped endpoint
  }

  /**
   * Resends a pending invitation email.
   */
  @Patch(":id/resend")
  @ApiOperation({ summary: "Resend an invitation" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Invitation resent successfully.",
    type: InvitationResponseDto,
  })
  async resendInvitation(): Promise<void> {
    // Implementation delegated to org-scoped endpoint
  }

  /**
   * Deletes/cancels a pending invitation.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an invitation" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Invitation deleted successfully.",
  })
  async removeInvitation(): Promise<void> {
    // Implementation delegated to org-scoped endpoint
  }
}
