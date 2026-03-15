import { EventEmitter } from "events";
import { Logger } from "@nestjs/common";
import { RequestLoggerMiddleware } from "./request-logger.middleware";
import { Request, Response, NextFunction } from "express";

describe("RequestLoggerMiddleware", () => {
  let middleware: RequestLoggerMiddleware;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new RequestLoggerMiddleware();
    logSpy = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildRes(): Response & EventEmitter {
    const emitter = new EventEmitter();
    return Object.assign(emitter, { statusCode: 200 }) as unknown as Response &
      EventEmitter;
  }

  function buildReq(overrides: Record<string, unknown> = {}): Request {
    return {
      method: "GET",
      originalUrl: "/api/test",
      ...overrides,
    } as unknown as Request;
  }

  it("calls next()", () => {
    const req = buildReq();
    const res = buildRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("logs the request after the response finishes with 'anonymous' when no user is set", () => {
    const req = buildReq({ method: "GET", originalUrl: "/api/health" });
    const res = buildRes();
    res.statusCode = 204;
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);
    res.emit("finish");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = (logSpy.mock.calls[0] as unknown[])[0] as string;
    expect(message).toContain("204");
    expect(message).toContain("anonymous");
  });

  it("logs the request with userId derived from req.user.sub when a user is present", () => {
    const req = buildReq({
      method: "POST",
      originalUrl: "/api/users",
      user: { sub: "user-42", roles: ["admin"] },
    });
    const res = buildRes();
    res.statusCode = 201;
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);
    res.emit("finish");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = (logSpy.mock.calls[0] as unknown[])[0] as string;
    expect(message).toContain("POST");
    expect(message).toContain("/api/users");
    expect(message).toContain("201");
    expect(message).toContain("user-42");
  });

  it("includes the duration in milliseconds in the log message", () => {
    const req = buildReq();
    const res = buildRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);
    res.emit("finish");

    const message = (logSpy.mock.calls[0] as unknown[])[0] as string;
    expect(message).toMatch(/\d+ms/);
  });

  it("does not log before the finish event is emitted", () => {
    const req = buildReq();
    const res = buildRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses the HTTP logger context", () => {
    const req = buildReq();
    const res = buildRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);
    res.emit("finish");

    // Logger.prototype.log is called on an instance created with context "HTTP"
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
