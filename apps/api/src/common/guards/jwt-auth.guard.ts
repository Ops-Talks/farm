import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context) as boolean;
  }

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
        "Invalid JWT signature received - possible token tampering",
        { context: JwtAuthGuard.name },
      );
      throw new UnauthorizedException("Invalid token");
    }
    if (err || !user) {
      throw (err as Error) || new UnauthorizedException();
    }
    return user;
  }
}
