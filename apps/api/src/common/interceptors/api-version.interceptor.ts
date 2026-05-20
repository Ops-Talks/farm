import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { Response } from "express";

/**
 * Global interceptor that appends the X-API-Version response header to every
 * HTTP response so clients can confirm which API version served their request.
 *
 * The value is always "1" because the codebase currently exposes only v1.
 * Increment the constant when a new version is promoted to default.
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        response.setHeader("X-API-Version", "1");
      }),
    );
  }
}
