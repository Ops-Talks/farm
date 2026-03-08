import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Histogram } from "prom-client";

/**
 * Interceptor that records Prometheus metrics for every HTTP request:
 * - http_requests_total: counter by method, route, and status code
 * - http_request_duration_seconds: histogram by method, route, and status code
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric("http_requests_total")
    private readonly requestCounter: Counter<string>,
    @InjectMetric("http_request_duration_seconds")
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.recordMetrics(req, res, startTime),
        error: () => this.recordMetrics(req, res, startTime),
      }),
    );
  }

  private recordMetrics(req: Request, res: Response, startTime: number): void {
    const route =
      (req.route as { path?: string } | undefined)?.path ?? req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    this.requestCounter.inc(labels);
    this.requestDuration.observe(labels, (Date.now() - startTime) / 1000);
  }
}
