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
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
  ApiBearerAuth,
  ApiParam,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import type { Request, NextFunction } from "express";
import type { Response } from "express";
import * as passport from "passport";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { KeycloakOidcService } from "./keycloak-oidc.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenCookieDto } from "./dto/refresh-token-cookie.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RefreshResponseDto } from "./dto/refresh-response.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { User } from "./entities/user.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { KeycloakSyncJobData } from "./keycloak-sync.service";
import { LdapAuthGuard } from "./guards/ldap-auth.guard";

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
   * Authenticates a user and sets httpOnly cookies for the access and refresh
   * tokens.  Tokens are NOT returned in the response body (XSS hardening —
   * only httpOnly cookies are inaccessible to JavaScript).
   * Applies strict rate limiting: 5 requests per minute, bypasses the long-window global limit.
   * @param loginDto - Login credentials
   * @param res - Express response used to write Set-Cookie headers
   * @returns A confirmation message and the user profile (no tokens in body)
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
      "Successfully authenticated. " +
      "Tokens are delivered via httpOnly Set-Cookie headers " +
      "(access_token, 15 min; refresh_token, 7 days — scoped to /api/v1/auth/refresh).",
    type: LoginResponseDto,
    headers: {
      "Set-Cookie": {
        description:
          "access_token=<jwt>; HttpOnly; SameSite=Lax and " +
          "refresh_token=<opaque>; HttpOnly; SameSite=Lax; Path=/api/v1/auth/refresh",
        schema: { type: "string" },
      },
    },
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
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto);

    const isProduction = process.env.NODE_ENV === "production";
    const baseCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
    };

    res.cookie("access_token", result.token, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/v1/auth/refresh", // scope to refresh endpoint only
    });

    // Return user profile without tokens — cookies carry them instead.
    return { message: "Login successful", user: result.user };
  }

  /**
   * Refreshes an access token using the refresh_token httpOnly cookie.
   * The refresh token is rotated on each use; new tokens are set via cookies.
   * Username is resolved from the body (backward-compat) or decoded from the
   * access_token cookie payload (browser clients).
   * @param body - Optional body — may contain `username` and/or `refreshToken`
   * @param req - Express request carrying cookies
   * @param res - Express response used to write Set-Cookie headers
   * @returns A confirmation message (no tokens in body)
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @ApiCookieAuth()
  @ApiOperation({ summary: "Refresh access token" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 10 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Successfully refreshed. " +
      "Rotated tokens are delivered via httpOnly Set-Cookie headers.",
    type: RefreshResponseDto,
    headers: {
      "Set-Cookie": {
        description:
          "access_token=<jwt>; HttpOnly; SameSite=Lax and " +
          "refresh_token=<opaque>; HttpOnly; SameSite=Lax; Path=/api/v1/auth/refresh",
        schema: { type: "string" },
      },
    },
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
    @Body() body: RefreshTokenCookieDto,
    @Req() req: Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    // Refresh token: httpOnly cookie takes precedence, body is a fallback for
    // API clients and e2e tests that cannot set cookies via supertest.
    const cookieRefresh = (req.cookies as Record<string, string | undefined>)[
      "refresh_token"
    ];
    const refreshToken = cookieRefresh ?? body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException(
        "Missing refresh token: provide a refresh_token cookie or body field.",
      );
    }

    const result = await this.authService.refresh(refreshToken);

    const isProduction = process.env.NODE_ENV === "production";
    const baseCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
    };

    res.cookie("access_token", result.token, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/v1/auth/refresh",
    });

    return { message: "Token refreshed" };
  }

  /**
   * Logs out the current user by clearing the auth cookies and revoking the
   * refresh token so it cannot be used again even if the cookie persists.
   * @param req - Express request used to read the refresh_token cookie
   * @param res - Express response used to clear Set-Cookie headers
   * @returns A confirmation message
   */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Logout — clear auth cookies" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Cookies cleared. User is now logged out.",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Logged out successfully" },
      },
    },
  })
  async logout(
    @Req() req: Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const cookieRefresh = (req.cookies as Record<string, string | undefined>)[
      "refresh_token"
    ];
    // Best-effort revocation — if the token is not found the logout still
    // succeeds (clearing the cookie is the authoritative sign-out action).
    await this.authService.logout(cookieRefresh);
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth/refresh" });
    return { message: "Logged out successfully" };
  }

  /**
   * Retrieves all registered users. Requires global admin role.
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
    description: "Forbidden — insufficient org-scoped permissions.",
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
   * Authenticates a user via LDAP / Active Directory.
   * Accepts username and password in the request body.
   * Returns JWT access and refresh tokens on success.
   * Returns 503 when LDAP is not configured.
   * @param req - Express request carrying the validated LDAP user
   * @returns JWT tokens and user profile
   */
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
   * Requires ORG_MANAGE permission.
   *
   * @param orgId - UUID of the organization to sync
   * @returns Whether the job was successfully enqueued
   */
  @Post("keycloak/sync/:orgId")
  @OrgRequired()
  @UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
  @RequiresPermission(Permission.ORG_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiHeader({
    name: "x-organization-id",
    required: true,
    description: "Organization ID",
  })
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
    description: "Forbidden — insufficient org-scoped permissions.",
    type: ErrorResponseDto,
  })
  async triggerKeycloakSync(
    @Param("orgId") orgId: string,
  ): Promise<{ queued: boolean }> {
    await this.keycloakSyncQueue?.add("sync-org", { orgId });
    return { queued: true };
  }
}
