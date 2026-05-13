import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Maximum allowed length for a client-supplied request ID.
 * Values exceeding this length are discarded and replaced with a generated UUID.
 */
const REQUEST_ID_MAX_LENGTH = 128;

/**
 * Allowed characters for a client-supplied request ID.
 * Only alphanumerics, hyphens, underscores, and dots are accepted to prevent
 * header injection and log pollution.
 */
const REQUEST_ID_SAFE_PATTERN = /^[A-Za-z0-9\-_.]+$/;

/**
 * Middleware that ensures every inbound request has a unique correlation ID.
 *
 * If the client provides an X-Request-Id header whose value passes validation
 * (length <= 128, only alphanumerics/hyphens/underscores/dots), it is reused so
 * that end-to-end correlation across the web app and API stays consistent.
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
    const raw = req.headers[REQUEST_ID_HEADER];
    // Express parses duplicate headers as string[]; take the first element.
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    const id = this.sanitize(candidate);

    (req as Request & { requestId: string }).requestId = id;
    res.setHeader("X-Request-Id", id);

    next();
  }

  /**
   * Returns the candidate value when it is a non-empty string that does not
   * exceed the maximum length and only contains safe characters.  Otherwise
   * returns a freshly generated UUID.
   */
  private sanitize(candidate: string | undefined): string {
    if (
      typeof candidate === "string" &&
      candidate.length > 0 &&
      candidate.length <= REQUEST_ID_MAX_LENGTH &&
      REQUEST_ID_SAFE_PATTERN.test(candidate)
    ) {
      return candidate;
    }
    return randomUUID();
  }
}
