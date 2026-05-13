import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

/**
 * Guard that protects routes using JWT authentication.
 * Distinguishes between expired tokens (routine, DEBUG) and invalid
 * signatures (potential tampering, WARN) for better log signal-to-noise.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (info instanceof TokenExpiredError) {
      this.logger.debug("JWT token expired", { context: JwtAuthGuard.name });
      throw new UnauthorizedException("Token expired");
    }
    if (info instanceof JsonWebTokenError) {
      this.logger.warn(
        "Invalid JWT signature received — possible token tampering",
        {
          context: JwtAuthGuard.name,
        },
      );
      throw new UnauthorizedException("Invalid token");
    }
    if (err || !user) {
      throw (err as Error) || new UnauthorizedException();
    }
    return user;
  }
}
