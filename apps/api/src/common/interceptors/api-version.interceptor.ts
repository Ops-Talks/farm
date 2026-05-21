import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { Response } from "express";

/**
 * Global interceptor that appends the X-API-Version response header to every
 * HTTP response so clients can confirm which API version served their request.
 *
 * The value is always "1" because the codebase currently exposes only v1.
 * Increment the constant when a new version is promoted to default.
 *
 * The header is set BEFORE next.handle() (not in tap()) so that controllers
 * using @Res() / passthrough:false (e.g. TracesIngestController) can call
 * res.send() without triggering ERR_HTTP_HEADERS_SENT.
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    if (!response.headersSent) {
      response.setHeader("X-API-Version", "1");
    }
    return next.handle();
  }
}
