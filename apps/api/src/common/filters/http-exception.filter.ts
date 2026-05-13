import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { trace, context as otelContext } from "@opentelemetry/api";
import { QueryFailedError } from "typeorm";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_NOT_NULL_VIOLATION = "23502";

/**
 * Global exception filter to handle all types of exceptions
 * and provide a consistent error response format.
 *
 * TypeORM QueryFailedError is translated to the appropriate HTTP status:
 * - 23505 unique_violation      → 409 Conflict
 * - 23503 foreign_key_violation → 400 Bad Request
 * - 23502 not_null_violation    → 400 Bad Request
 *
 * All 4xx errors are logged at WARN level. 5xx at ERROR.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolveException(exception);

    const status =
      resolved instanceof HttpException
        ? resolved.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseContent =
      resolved instanceof HttpException
        ? resolved.getResponse()
        : "Internal server error";

    const logMessage = `${request.method} ${request.url} - Status: ${status}`;
    const stack =
      resolved instanceof Error ? resolved.stack : JSON.stringify(resolved);

    if (status >= 500) {
      this.logger.error(logMessage, stack);
    } else {
      // For ValidationPipe BadRequestExceptions (message is an array of constraint
      // failures), log the constraint names to aid debugging without exposing values.
      if (resolved instanceof BadRequestException) {
        const body = resolved.getResponse() as Record<string, unknown>;
        const msgs = body.message;
        if (Array.isArray(msgs)) {
          this.logger.warn(
            `Validation failed: ${request.method} ${request.url}`,
            { constraints: msgs, context: "AllExceptionsFilter" },
          );
        } else {
          this.logger.warn(logMessage);
        }
      } else {
        this.logger.warn(logMessage);
      }
    }

    const message =
      typeof responseContent === "object" && responseContent !== null
        ? (responseContent as Record<string, unknown>).message ||
          JSON.stringify(responseContent)
        : responseContent;

    const spanContext = trace.getSpan(otelContext.active())?.spanContext();
    const requestId = (request as Request & { requestId?: string }).requestId;

    // Correlation fields (requestId, traceId, spanId) are omitted in production
    // unless EXPOSE_CORRELATION_IDS=true is explicitly set, to limit information
    // disclosure to unauthenticated callers on public-facing deployments.
    const exposeCorrelation =
      process.env.NODE_ENV !== "production" ||
      process.env.EXPOSE_CORRELATION_IDS === "true";

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(exposeCorrelation && requestId && { requestId }),
      ...(exposeCorrelation &&
        spanContext?.traceId && { traceId: spanContext.traceId }),
      ...(exposeCorrelation &&
        spanContext?.spanId && { spanId: spanContext.spanId }),
    });
  }

  private resolveException(exception: unknown): unknown {
    if (!(exception instanceof QueryFailedError)) {
      return exception;
    }

    const pgCode = (exception.driverError as { code?: string } | undefined)
      ?.code;

    switch (pgCode) {
      case PG_UNIQUE_VIOLATION:
        return new ConflictException(
          "A record with this value already exists.",
        );
      case PG_FOREIGN_KEY_VIOLATION:
        return new BadRequestException("Referenced record does not exist.");
      case PG_NOT_NULL_VIOLATION:
        return new BadRequestException("A required field is missing.");
      default:
        return exception;
    }
  }
}
