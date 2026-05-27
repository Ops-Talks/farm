import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
}

/**
 * Extracts the JWT from the `access_token` httpOnly cookie first, then falls
 * back to the `Authorization: Bearer` header.  The dual-source approach keeps
 * e2e tests and direct API clients (which use Bearer tokens) working while
 * browser clients transparently use the cookie set at login.
 */
function cookieOrBearerExtractor(req: Request): string | null {
  const cookie = (req?.cookies as Record<string, string> | undefined)?.[
    "access_token"
  ];
  if (cookie) {
    return cookie;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

/**
 * Passport strategy for JWT authentication.
 * Accepts tokens from either the httpOnly `access_token` cookie (browser
 * clients) or the `Authorization: Bearer` header (API clients / e2e tests).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("auth.jwtSecret") ?? "",
    });
  }

  /**
   * Validates the JWT payload.
   * @param payload - The JWT payload
   * @returns User information extracted from the payload
   */
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}
