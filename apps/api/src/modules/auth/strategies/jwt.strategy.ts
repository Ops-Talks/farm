import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { Request } from "express";
import { User } from "../entities/user.entity";

interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  tokenVersion: number;
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
 *
 * In addition to verifying the signature and expiry, validate() performs a
 * database round-trip to check:
 * - The user still exists (not deleted)
 * - The account is not suspended
 * - tokenVersion in the payload matches the current value on the user row,
 *   ensuring that a password change or explicit session revocation immediately
 *   invalidates all previously issued access-tokens.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("auth.jwtSecret") ?? "",
    });
  }

  /**
   * Validates the JWT payload against the current user record in the database.
   * @param payload - The decoded JWT payload
   * @returns Minimal user context that is attached to req.user
   * @throws UnauthorizedException if the user is not found, suspended,
   *         or the tokenVersion has been incremented since the token was issued
   */
  async validate(
    payload: JwtPayload,
  ): Promise<{ userId: string; username: string; roles: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    if (user.suspended) {
      throw new UnauthorizedException("Account suspended");
    }
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException("Token has been invalidated");
    }
    return {
      userId: user.id,
      username: user.username,
      roles: user.roles,
    };
  }
}
