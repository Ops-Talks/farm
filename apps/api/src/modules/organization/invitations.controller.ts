import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

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
@UseGuards(JwtAuthGuard)
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
}
