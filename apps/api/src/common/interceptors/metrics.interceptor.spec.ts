import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { getToken } from "@willsoto/nestjs-prometheus";
import * as otelApi from "@opentelemetry/api";
import { MetricsInterceptor } from "./metrics.interceptor";

describe("MetricsInterceptor", () => {
  let interceptor: MetricsInterceptor;

  const mockCounter = { inc: jest.fn() };
  const mockHistogram = { observe: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        {
          provide: getToken("http_requests_total"),
          useValue: mockCounter,
        },
        {
          provide: getToken("http_request_duration_seconds"),
          useValue: mockHistogram,
        },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildContext(
    req: Record<string, unknown>,
    res: Record<string, unknown>,
  ): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
        getResponse: jest.fn().mockReturnValue(res),
      }),
    } as unknown as ExecutionContext;
  }

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("records metrics on a successful request using req.route.path", (done) => {
    const req = { method: "GET", path: "/fallback", route: { path: "/users" } };
    const res = { statusCode: 200 };
    const context = buildContext(req, res);
    const next: CallHandler = { handle: () => of({ data: "ok" }) };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(mockCounter.inc).toHaveBeenCalledWith({
          method: "GET",
          route: "/users",
          status_code: "200",
        });

        expect(mockHistogram.observe).toHaveBeenCalledWith(
          expect.objectContaining({
            labels: { method: "GET", route: "/users", status_code: "200" },
          }),
        );
        done();
      },
      error: done,
    });
  });

  it("falls back to req.path when req.route is undefined", (done) => {
    const req = { method: "POST", path: "/api/items", route: undefined };
    const res = { statusCode: 201 };
    const context = buildContext(req, res);
    const next: CallHandler = { handle: () => of(null) };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(mockCounter.inc).toHaveBeenCalledWith({
          method: "POST",
          route: "/api/items",
          status_code: "201",
        });

        expect(mockHistogram.observe).toHaveBeenCalledWith(
          expect.objectContaining({
            labels: { method: "POST", route: "/api/items", status_code: "201" },
          }),
        );
        done();
      },
      error: done,
    });
  });

  it("falls back to req.path when req.route has no path property", (done) => {
    const req = { method: "DELETE", path: "/api/remove", route: {} };
    const res = { statusCode: 204 };
    const context = buildContext(req, res);
    const next: CallHandler = { handle: () => of(undefined) };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(mockCounter.inc).toHaveBeenCalledWith({
          method: "DELETE",
          route: "/api/remove",
          status_code: "204",
        });
        done();
      },
      error: done,
    });
  });

  it("records metrics on error (tap error branch)", (done) => {
    const req = { method: "GET", path: "/error", route: { path: "/error" } };
    const res = { statusCode: 500 };
    const context = buildContext(req, res);
    const next: CallHandler = {
      handle: () => throwError(() => new Error("boom")),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        done(new Error("Expected error path, not next"));
      },
      error: () => {
        expect(mockCounter.inc).toHaveBeenCalledWith({
          method: "GET",
          route: "/error",
          status_code: "500",
        });

        expect(mockHistogram.observe).toHaveBeenCalledWith(
          expect.objectContaining({
            labels: { method: "GET", route: "/error", status_code: "500" },
          }),
        );
        done();
      },
    });
  });

  it("passes the observed duration as a non-negative number", (done) => {
    const req = { method: "GET", path: "/timing", route: { path: "/timing" } };
    const res = { statusCode: 200 };
    const context = buildContext(req, res);
    const next: CallHandler = { handle: () => of("response") };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        const call = mockHistogram.observe.mock.calls[0] as [
          { labels: unknown; value: number },
        ];
        expect(call[0].value).toBeGreaterThanOrEqual(0);
        done();
      },
      error: done,
    });
  });

  it("attaches exemplarLabels when a valid OTel span is active", (done) => {
    const mockSpanContext = {
      traceId: "abcdef1234567890abcdef1234567890",
      spanId: "1234567890abcdef",
      traceFlags: 1,
    };
    const mockSpan = {
      spanContext: jest.fn().mockReturnValue(mockSpanContext),
    };
    jest.spyOn(otelApi.trace, "getActiveSpan").mockReturnValue(mockSpan);
    jest.spyOn(otelApi, "isValidTraceId").mockReturnValue(true);

    const req = {
      method: "GET",
      path: "/traced",
      route: { path: "/traced" },
    };
    const res = { statusCode: 200 };
    const context = buildContext(req, res);
    const next: CallHandler = { handle: () => of("ok") };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(mockHistogram.observe).toHaveBeenCalledWith(
          expect.objectContaining({
            exemplarLabels: {
              traceId: "abcdef1234567890abcdef1234567890",
              spanId: "1234567890abcdef",
            },
          }),
        );
        done();
      },
      error: done,
    });
  });

  it("observes without exemplarLabels when no valid span is active", (done) => {
    jest.spyOn(otelApi.trace, "getActiveSpan").mockReturnValue(undefined);
    jest.spyOn(otelApi, "isValidTraceId").mockReturnValue(false);

    const req = { method: "GET", path: "/nospan", route: { path: "/nospan" } };
    const res = { statusCode: 200 };
    const context = buildContext(req, res);
    const next: CallHandler = { handle: () => of("ok") };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(mockHistogram.observe).toHaveBeenCalled();
        const call = mockHistogram.observe.mock.calls[0] as [
          Record<string, unknown>,
        ];
        expect(call[0]).not.toHaveProperty("exemplarLabels");
        done();
      },
      error: done,
    });
  });
});
