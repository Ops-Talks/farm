import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Middleware that ensures every inbound request has a unique correlation ID.
 *
 * If the client provides an X-Request-Id header, its value is reused so that
 * end-to-end correlation across the web app and API stays consistent.
 * Otherwise a new UUID v4 is generated.
 *
 * The ID is attached to:
 * - req['requestId'] so the global exception filter can include it in error
 *   response bodies
 * - The X-Request-Id response header so the web app can extract it from any
 *   response and include it in its own logs
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id =
      typeof incoming === "string" && incoming.length > 0
        ? incoming
        : randomUUID();

    (req as Request & { requestId: string }).requestId = id;
    res.setHeader("X-Request-Id", id);

    next();
  }
}
