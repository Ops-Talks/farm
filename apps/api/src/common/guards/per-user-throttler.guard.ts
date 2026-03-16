import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Request } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    id?: string;
  };
}

/**
 * Throttler guard that uses the authenticated user ID as the rate limit bucket key.
 * Falls back to the client IP address for unauthenticated requests.
 * This ensures per-user rate limiting rather than per-IP limiting.
 */
@Injectable()
export class PerUserThrottlerGuard extends ThrottlerGuard {
  /**
   * Returns the tracker key for rate limiting.
   * Authenticated users are tracked by their user ID.
   * Unauthenticated requests are tracked by their IP address.
   * @param req - The incoming HTTP request
   * @returns The tracker key string
   */
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as AuthenticatedRequest;
    const userId = request.user?.userId ?? request.user?.id;
    return Promise.resolve(userId ?? (request.ip as string));
  }
}
