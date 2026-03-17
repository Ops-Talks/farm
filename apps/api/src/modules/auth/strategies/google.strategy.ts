import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";

/**
 * Passport strategy for Google OAuth2 authentication.
 * Disabled automatically when GOOGLE_CLIENT_ID is not configured.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID:
        configService.get<string>("oauth.google.clientId") || "disabled",
      clientSecret:
        configService.get<string>("oauth.google.clientSecret") || "disabled",
      callbackURL:
        configService.get<string>("oauth.google.callbackUrl") ||
        "http://localhost:3000/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  /**
   * Validates the Google OAuth profile and resolves the Farm user.
   * @param accessToken - Google access token
   * @param refreshToken - Google refresh token (may be null)
   * @param profile - Google user profile
   * @param done - Passport done callback
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: User | false) => void,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value || `${profile.id}@google.oauth`;
      const result = await this.authService.findOrCreateOAuthUser(
        "google",
        profile.id,
        {
          email,
          displayName:
            profile.displayName || profile.name?.givenName || profile.id,
        },
      );
      done(null, result.user);
    } catch (error) {
      this.logger.error("Google OAuth validation failed", error);
      done(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
