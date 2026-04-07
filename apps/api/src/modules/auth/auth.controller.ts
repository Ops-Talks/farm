import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Req,
  Res,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Next,
  Optional,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import type { Request, NextFunction } from "express";
import type { Response } from "express";
import * as passport from "passport";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AuthService } from "./auth.service";
import { KeycloakOidcService } from "./keycloak-oidc.service";
import { RegisterUserDto } from "./dto/register-user.dto";
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
    @Optional()
    @InjectQueue(QUEUE_NAMES.KEYCLOAK_SYNC)
    private readonly keycloakSyncQueue: Queue<KeycloakSyncJobData> | null,
  ) {}

  /**
   * Registers a new user account.
   * Applies strict rate limiting: 5 requests per minute, bypasses the long-window global limit.
   * @param registerUserDto - Registration data
   * @returns The created user profile
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "Register a new user" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 5 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The user has been successfully registered.",
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "User already exists.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Too many requests. Rate limit: 5 per minute.",
    type: ErrorResponseDto,
  })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return await this.authService.register(registerUserDto);
  }

  /**
   * Authenticates a user and returns an access token with a refresh token.
   * Applies strict rate limiting: 5 requests per minute, bypasses the long-window global limit.
   * @param loginDto - Login credentials
   * @returns The authenticated user, access token, and refresh token
   */
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
  @ApiOperation({ summary: "Get all users (admin only)" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all users.",
    type: [User],
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

  /**
   * Initiates GitHub OAuth2 authorization flow.
   * Redirects the client to GitHub for authentication.
   */
  @Get("github")
  @UseGuards(AuthGuard("github"))
  @SkipThrottle()
  @ApiExcludeEndpoint()
  githubAuth(): void {
    // Guard handles the redirect to GitHub
  }

  /**
   * GitHub OAuth2 callback endpoint.
   * Exchanges the authorization code for a JWT and refresh token.
   * @param req - Express request containing the authenticated user
   * @param res - Express response used to return the token payload
   */
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

  /**
   * Initiates Google OAuth2 authorization flow.
   * Redirects the client to Google for authentication.
   */
  @Get("google")
  @UseGuards(AuthGuard("google"))
  @SkipThrottle()
  @ApiExcludeEndpoint()
  googleAuth(): void {
    // Guard handles the redirect to Google
  }

  /**
   * Google OAuth2 callback endpoint.
   * Exchanges the authorization code for a JWT and refresh token.
   * @param req - Express request containing the authenticated user
   * @param res - Express response used to return the token payload
   */
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
   * Dynamically builds a strategy from the org's stored Keycloak credential.
   * Redirects to the frontend with an error query parameter when not configured.
   *
   * @param orgId - UUID of the organization requesting Keycloak login
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  @Get("keycloak")
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async keycloakAuth(
    @Query("orgId") orgId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    if (!orgId) {
      res.redirect("/?error=keycloak_not_configured");
      return;
    }

    const strategy = await this.keycloakOidcService.getStrategyForOrg(orgId);

    if (!strategy) {
      res.redirect("/?error=keycloak_not_configured");
      return;
    }

    // Store orgId in the session so the callback can retrieve it.
    (req as Request & { session: Record<string, unknown> }).session[
      "keycloakOrgId"
    ] = orgId;

    passport.use("keycloak-dynamic", strategy);

    (
      passport.authenticate("keycloak-dynamic", {
        scope: ["openid", "email", "profile"],
      }) as (req: Request, res: Response, next: NextFunction) => void
    )(req, res, next);
  }

  /**
   * Keycloak OIDC callback endpoint.
   * Completes authentication and returns a JWT to the caller.
   *
   * @param req - Express request carrying the authenticated user
   * @param res - Express response object
   * @param next - Express next function
   */
  @Get("keycloak/callback")
  @SkipThrottle()
  @ApiExcludeEndpoint()
  // eslint-disable-next-line @typescript-eslint/require-await
  async keycloakCallback(
    @Req() req: Request & { user?: User },
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    (
      passport.authenticate(
        "keycloak-dynamic",
        { session: false },
        (err: unknown, user: User | false | undefined) => {
          if (err || !user) {
            res.redirect("/?error=keycloak_auth_failed");
            return;
          }

          this.authService
            .findOrCreateOAuthUser("keycloak", user.oauthProviderId as string, {
              email: user.email,
              displayName: user.displayName,
            })
            .then((result) => {
              res.json({
                user: result.user,
                token: result.token,
                refreshToken: result.refreshToken,
              });
            })
            .catch(next);
        },
      ) as (req: Request, res: Response, next: NextFunction) => void
    )(req, res, next);
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
  @ApiOperation({ summary: "Trigger Keycloak group sync for an org (admin)" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Sync job enqueued.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized.",
    type: ErrorResponseDto,
  })
  async triggerKeycloakSync(
    @Param("orgId") orgId: string,
  ): Promise<{ queued: boolean }> {
    await this.keycloakSyncQueue?.add("sync-org", { orgId });
    return { queued: true };
  }
}
