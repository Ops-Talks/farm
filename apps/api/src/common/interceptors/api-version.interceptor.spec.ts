import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { ApiVersionInterceptor } from "./api-version.interceptor";

describe("ApiVersionInterceptor", () => {
  let interceptor: ApiVersionInterceptor;

  beforeEach(() => {
    interceptor = new ApiVersionInterceptor();
  });

  /**
   * Builds a minimal ExecutionContext stub with a mock response object that
   * records setHeader calls so assertions can inspect them.
   */
  function buildContext(res: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(res),
      }),
    } as unknown as ExecutionContext;
  }

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("sets X-API-Version to '1' before calling next.handle()", () => {
    const setHeader = jest.fn();
    const context = buildContext({ setHeader, headersSent: false });
    const next: CallHandler = { handle: () => of({ data: "ok" }) };

    interceptor.intercept(context, next);

    expect(setHeader).toHaveBeenCalledWith("X-API-Version", "1");
  });

  it("sets X-API-Version even when the response body is null", (done) => {
    const setHeader = jest.fn();
    const context = buildContext({ setHeader, headersSent: false });
    const next: CallHandler = { handle: () => of(null) };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(setHeader).toHaveBeenCalledWith("X-API-Version", "1");
        done();
      },
      error: done,
    });
  });

  it("sets X-API-Version exactly once per request", () => {
    const setHeader = jest.fn();
    const context = buildContext({ setHeader, headersSent: false });
    const next: CallHandler = { handle: () => of("response") };

    interceptor.intercept(context, next);

    expect(setHeader).toHaveBeenCalledTimes(1);
  });

  it("sets X-API-Version even when the handler throws an error", (done) => {
    const setHeader = jest.fn();
    const context = buildContext({ setHeader });
    const next: CallHandler = {
      handle: () => throwError(() => new Error("handler error")),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        done(new Error("expected error path"));
      },
      error: () => {
        expect(setHeader).toHaveBeenCalledWith("X-API-Version", "1");
        done();
      },
    });
  });

  it("passes the response value through without modification", (done) => {
    const payload = { id: 1, name: "test" };
    const setHeader = jest.fn();
    const context = buildContext({ setHeader, headersSent: false });
    const next: CallHandler = { handle: () => of(payload) };

    interceptor.intercept(context, next).subscribe({
      next: (value) => {
        expect(value).toBe(payload);
        done();
      },
      error: done,
    });
  });

  it("skips setHeader when headers have already been sent", () => {
    const setHeader = jest.fn();
    // Simulates a controller that used @Res() and called res.send() before the
    // interceptor could act — e.g. TracesIngestController.
    const context = buildContext({ setHeader, headersSent: true });
    const next: CallHandler = { handle: () => of("response") };

    interceptor.intercept(context, next);

    expect(setHeader).not.toHaveBeenCalled();
  });
});
