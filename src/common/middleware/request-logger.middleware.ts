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
      const user = (req as unknown as Record<string, unknown>).user;
      const userId =
        user != null
          ? String((user as Record<string, unknown>).sub)
          : "anonymous";
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${duration}ms - ${userId}`,
      );
    });

    next();
  }
}
