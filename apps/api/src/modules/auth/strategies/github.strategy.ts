import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-github2";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";

/**
 * Passport strategy for GitHub OAuth2 authentication.
 * Disabled automatically when GITHUB_CLIENT_ID is not configured.
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID:
        configService.get<string>("oauth.github.clientId") || "disabled",
      clientSecret:
        configService.get<string>("oauth.github.clientSecret") || "disabled",
      callbackURL:
        configService.get<string>("oauth.github.callbackUrl") ||
        "http://localhost:3000/api/v1/auth/github/callback",
      scope: ["user:email"],
    });
  }

  /**
   * Validates the GitHub OAuth profile and resolves the Farm user.
   * @param accessToken - GitHub access token
   * @param refreshToken - GitHub refresh token (may be null)
   * @param profile - GitHub user profile
   * @param done - Passport done callback
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: User | false) => void,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value || `${profile.id}@github.oauth`;
      const result = await this.authService.findOrCreateOAuthUser(
        "github",
        profile.id,
        {
          email,
          displayName: profile.displayName || profile.username || email,
          username: profile.username,
        },
      );
      done(null, result.user);
    } catch (error) {
      this.logger.error("GitHub OAuth validation failed", error);
      done(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
