import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Req,
  Res,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Optional,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { Response } from "express";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { KeycloakOidcService } from "./keycloak-oidc.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RefreshResponseDto } from "./dto/refresh-response.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { User } from "./entities/user.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { KeycloakSyncJobData } from "./keycloak-sync.service";
import { LdapAuthGuard } from "./guards/ldap-auth.guard";
import { KeycloakDynamicGuard } from "./guards/keycloak-auth.guard";
import { KeycloakCallbackGuard } from "./guards/keycloak-callback.guard";
import { Public } from "../../common/decorators/public.decorator";

/**
 * Controller for authentication and user management operations.
 */
@ApiTags("Authentication")
@Controller("auth")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly keycloakOidcService: KeycloakOidcService,
    @Optional() private readonly configService: ConfigService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.KEYCLOAK_SYNC)
    private readonly keycloakSyncQueue: Queue<KeycloakSyncJobData> | null,
  ) {}

  /**
   * Authenticates a user and returns an access token with a refresh token.
   * Applies strict rate limiting: 5 requests per minute, bypasses the long-window global limit.
   * @param loginDto - Login credentials
   * @returns The authenticated user, access token, and refresh token
   */
  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "User login" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 5 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Successfully authenticated. Returns access token and refresh token.",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Too many requests. Rate limit: 5 per minute.",
    type: ErrorResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginDto);
  }

  /**
   * Refreshes an access token using a valid refresh token.
   * The refresh token is rotated on each use.
   * @param refreshTokenDto - Username and current refresh token
   * @returns A new access token and rotated refresh token
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: "Refresh access token" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 10 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Successfully refreshed. Returns new access token and rotated refresh token.",
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or expired refresh token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Too many requests. Rate limit: 10 per minute.",
    type: ErrorResponseDto,
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponseDto> {
    return await this.authService.refresh(
      refreshTokenDto.username,
      refreshTokenDto.refreshToken,
    );
  }

  /**
   * Retrieves all registered users. Requires admin role.
   * @returns An array of all user profiles
   */
  @Get("users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all users (admin only)" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all users.",
    type: [User],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized — missing or invalid JWT.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden — insufficient role.",
    type: ErrorResponseDto,
  })
  async findAll(): Promise<User[]> {
    return await this.authService.findAll();
  }

  /**
   * Returns the profile of the currently authenticated user.
   * @param req - Express request carrying the JWT payload
   * @returns The authenticated user entity
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the authenticated user profile.",
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized.",
    type: ErrorResponseDto,
  })
  async getProfile(
    @Req() req: Request & { user: { userId: string } },
  ): Promise<User> {
    return this.authService.getProfile(req.user.userId);
  }

  /**
   * Updates the profile of the currently authenticated user.
   * @param req - Express request carrying the JWT payload
   * @param dto - Profile fields to update
   * @returns The updated user entity
   */
  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Profile updated successfully.",
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Email already in use.",
    type: ErrorResponseDto,
  })
  async updateProfile(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  /**
   * Changes the password of the currently authenticated user.
   * Invalidates all existing sessions upon success.
   * @param req - Express request carrying the JWT payload
   * @param dto - Current password, new password, and confirmation
   */
  @Patch("profile/password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change current user password" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Password changed successfully.",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Passwords do not match.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized or wrong current password.",
    type: ErrorResponseDto,
  })
  async changePassword(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(req.user.userId, dto);
  }

  /** OAuth callback — browser redirect flow, not a REST endpoint. Excluded from Swagger UI. */
  @Public()
  @Get("github")
  @UseGuards(AuthGuard("github"))
  @SkipThrottle()
  @ApiExcludeEndpoint()
  githubAuth(): void {
    // Guard handles the redirect to GitHub
  }

  /** OAuth callback — browser redirect flow, not a REST endpoint. Excluded from Swagger UI. */
  @Public()
  @Get("github/callback")
  @UseGuards(AuthGuard("github"))
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async githubCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.authService.findOrCreateOAuthUser(
      "github",
      req.user.oauthProviderId as string,
      {
        email: req.user.email,
        displayName: req.user.displayName,
        username: req.user.username,
      },
    );
    res.json({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  }

  /** OAuth callback — browser redirect flow, not a REST endpoint. Excluded from Swagger UI. */
  @Public()
  @Get("google")
  @UseGuards(AuthGuard("google"))
  @SkipThrottle()
  @ApiExcludeEndpoint()
  googleAuth(): void {
    // Guard handles the redirect to Google
  }

  /** OAuth callback — browser redirect flow, not a REST endpoint. Excluded from Swagger UI. */
  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async googleCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.authService.findOrCreateOAuthUser(
      "google",
      req.user.oauthProviderId as string,
      {
        email: req.user.email,
        displayName: req.user.displayName,
      },
    );
    res.json({
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  }

  /**
   * Initiates Keycloak OIDC authorization flow for the given organization.
   * Uses KeycloakDynamicGuard to build and run a per-request strategy without
   * mutating the global Passport registry. The strategy is registered with a
   * unique name (scoped to the orgId) and cleaned up after the redirect.
   *
   * OAuth callback — browser redirect flow, not a REST endpoint. Excluded from Swagger UI.
   */
  @Public()
  @Get("keycloak")
  @UseGuards(KeycloakDynamicGuard)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  keycloakAuth(): void {}

  /**
   * Keycloak OIDC callback endpoint.
   * Uses KeycloakCallbackGuard to complete authentication and return a JWT.
   * The guard rebuilds the strategy from the session-stored orgId, runs it
   * without registering globally, and on success calls findOrCreateOAuthUser.
   *
   * OAuth callback — browser redirect flow, not a REST endpoint. Excluded from Swagger UI.
   */
  @Public()
  @Get("keycloak/callback")
  @UseGuards(KeycloakCallbackGuard)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  keycloakCallback(): void {}

  /**
   * Authenticates a user via LDAP / Active Directory.
   * Accepts username and password in the request body.
   * Returns JWT access and refresh tokens on success.
   * Returns 503 when LDAP is not configured.
   *
   * LDAP authentication — handled via passport-ldapauth, excluded from Swagger UI.
   *
   * @param req - Express request carrying the validated LDAP user
   * @returns JWT tokens and user profile
   */
  @Public()
  @Post("login/ldap")
  @HttpCode(HttpStatus.OK)
  @UseGuards(LdapAuthGuard)
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiExcludeEndpoint()
  async ldapLogin(
    @Req() req: Request & { user: User },
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    return this.authService.generateTokensForUser(req.user);
  }

  /**
   * Returns the list of enabled authentication providers.
   * Always includes "local". Other providers are listed when their
   * required environment variables are set.
   */
  @Public()
  @Get("providers")
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List enabled authentication providers" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns enabled auth providers.",
    schema: {
      type: "object",
      properties: {
        providers: {
          type: "array",
          items: { type: "string" },
          example: ["local", "github", "google", "ldap", "keycloak"],
        },
      },
    },
  })
  getProviders(): { providers: string[] } {
    const providers: string[] = ["local"];

    if (this.configService?.get<string>("oauth.github.clientId")) {
      providers.push("github");
    }
    if (this.configService?.get<string>("oauth.google.clientId")) {
      providers.push("google");
    }
    if (this.configService?.get<string>("ldap.url")) {
      providers.push("ldap");
    }
    // Keycloak is per-org (dynamic), so it is always listed.
    providers.push("keycloak");

    return { providers };
  }

  /**
   * Manually triggers a Keycloak group sync job for the specified organization.
   * Requires admin role.
   *
   * @param orgId - UUID of the organization to sync
   * @returns Whether the job was successfully enqueued
   */
  @Post("keycloak/sync/:orgId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Trigger Keycloak group sync for an org (admin)" })
  @ApiParam({ name: "orgId", description: "UUID of the organization to sync" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Sync job enqueued.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized — missing or invalid JWT.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden — insufficient role.",
    type: ErrorResponseDto,
  })
  async triggerKeycloakSync(
    @Param("orgId") orgId: string,
  ): Promise<{ queued: boolean }> {
    await this.keycloakSyncQueue?.add("sync-org", { orgId });
    return { queued: true };
  }
}
