import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware that logs incoming HTTP requests with method, path,
 * status code, response time, and authenticated user ID.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on("finish", () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const user = (req as unknown as Record<string, unknown>).user as
        | Record<string, unknown>
        | undefined;
      // Resolve the human-readable identifier using the shape produced by
      // JwtStrategy.validate() ({ userId, username, roles }) and fall back
      // to the raw JWT subject claim ("sub") for any legacy guards that
      // attach the unmapped payload.
      const userId =
        (user?.username as string | undefined) ??
        (user?.userId as string | undefined) ??
        (user?.sub as string | undefined) ??
        "anonymous";
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${duration}ms - ${userId}`,
      );
    });

    next();
  }
}
