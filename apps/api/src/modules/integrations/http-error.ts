import {
  BadGatewayException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { isAxiosError } from "axios";

/**
 * Translates an unknown error from an HTTP call (Axios or native fetch) into
 * an appropriate NestJS HttpException. Always throws — never returns.
 *
 * Mapping:
 * - fetch() network failure (TypeError) → 503 ServiceUnavailableException
 * - Axios network error (no response)   → 503 ServiceUnavailableException
 * - 401 / 403                           → 401 UnauthorizedException
 * - 404                                 → 404 NotFoundException
 * - other upstream HTTP status          → 502 BadGatewayException
 * - everything else                     → 500 InternalServerErrorException
 *
 * @param err       - The caught error value
 * @param operation - Caller identifier used in log messages (e.g. "JenkinsService.listJobs")
 * @param logger    - Logger instance from the calling service
 */
export function translateHttpError(
  err: unknown,
  operation: string,
  logger: Logger,
): never {
  // Pass through existing HTTP exceptions (e.g. ServiceUnavailableException
  // from an open circuit breaker) without re-wrapping them.
  if (err instanceof HttpException) {
    throw err;
  }

  // Native fetch() raises TypeError for network-level failures (DNS, connection
  // refused, etc.).  Handle before the Axios check so callers that use fetch()
  // instead of HttpService also receive accurate 503 responses.
  if (err instanceof TypeError) {
    logger.error(`${operation}: service unreachable`, {
      message: err.message,
    });
    throw new ServiceUnavailableException(
      `${operation}: integration service is currently unreachable`,
    );
  }

  if (isAxiosError(err)) {
    if (!err.response) {
      logger.error(`${operation}: service unreachable`, {
        code: err.code,
        url: err.config?.url,
      });
      throw new ServiceUnavailableException(
        `${operation}: integration service is currently unreachable`,
      );
    }
    const status = err.response.status;
    logger.error(`${operation}: upstream error`, {
      status,
      url: err.config?.url,
    });
    if (status === 401 || status === 403) {
      throw new UnauthorizedException(
        `${operation}: integration credentials are invalid or expired`,
      );
    }
    if (status === 404) {
      throw new NotFoundException(`${operation}: resource not found`);
    }
    throw new BadGatewayException(
      `${operation}: integration service returned status ${status}`,
    );
  }

  logger.error(`${operation}: unexpected error`, {
    error: err instanceof Error ? err.message : String(err),
  });
  throw new InternalServerErrorException(`${operation}: unexpected error`);
}
