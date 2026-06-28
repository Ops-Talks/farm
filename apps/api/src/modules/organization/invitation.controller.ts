import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { Throttle } from "@nestjs/throttler";
import { OrgRole } from "@farm/types";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRolesGuard } from "../../common/guards/org-roles.guard";
import { OrgRoles } from "../../common/decorators/org-roles.decorator";
import { InvitationPreview, InvitationService } from "./invitation.service";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationToken } from "./entities/invitation-token.entity";
import { Public } from "../../common/decorators/public.decorator";

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    userId: string;
    username: string;
    roles: string[];
  };
}

/**
 * Token-based organization invitation endpoints (Phase 37).
 * Coexists with the legacy `OrgInvitation` flow under
 * `/organizations/:id/invitations`.
 */
@ApiTags("Invitations")
@Controller("invitations")
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: "Create org invitations (batch)" })
  async create(
    @Body() dto: CreateInvitationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvitationToken[]> {
    return this.invitationService.createInvitations(req.user!.userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrgRole.MEMBER)
  @ApiOperation({ summary: "List invitations for an organization" })
  async list(
    @Query("organizationId") organizationId: string,
    @Query("orgId") orgIdAlias?: string,
    @Query("status") status?: "pending" | "accepted" | "revoked",
  ): Promise<InvitationToken[]> {
    const orgId = organizationId || orgIdAlias;
    if (!orgId) {
      return [];
    }
    return this.invitationService.listInvitations(orgId, status);
  }

  @Public()
  @Get("by-token/:token")
  @ApiOperation({
    summary: "Public preview of an invitation (no token leak in response)",
  })
  async preview(@Param("token") token: string): Promise<InvitationPreview> {
    return this.invitationService.getPreview(token);
  }

  @Public()
  @Post("by-token/:token/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept an invitation by token" })
  async accept(
    @Param("token") token: string,
  ): Promise<{ organizationId: string; role: OrgRole; userId: string }> {
    return this.invitationService.acceptInvitation(token);
  }

  @Patch(":id/resend")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Resend an invitation email" })
  async resend(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvitationToken> {
    return this.invitationService.resendInvitation(id, req.user!.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Revoke a pending invitation" })
  async revoke(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.invitationService.revokeInvitation(id, req.user!.userId);
  }
}
