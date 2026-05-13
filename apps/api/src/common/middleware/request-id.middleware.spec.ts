import { Request, Response, NextFunction } from "express";
import {
  RequestIdMiddleware,
  REQUEST_ID_HEADER,
} from "./request-id.middleware";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildReq(header?: string | string[]): Request & {
  requestId?: string;
} {
  const headers: Record<string, string | string[]> = {};
  if (header !== undefined) {
    headers[REQUEST_ID_HEADER] = header;
  }
  return { headers } as unknown as Request & { requestId?: string };
}

function buildRes(): Response {
  return {
    setHeader: jest.fn(),
  } as unknown as Response;
}

describe("RequestIdMiddleware", () => {
  let middleware: RequestIdMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    next = jest.fn();
  });

  it("generates a UUID when no X-Request-Id header is present", () => {
    const req = buildReq();
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("reuses a valid client-supplied request ID", () => {
    const clientId = "abc-123_def.456";
    const req = buildReq(clientId);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toBe(clientId);
  });

  it("sets the X-Request-Id response header to the resolved ID", () => {
    const clientId = "client-request-id";
    const req = buildReq(clientId);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(res.setHeader as jest.Mock).toHaveBeenCalledWith(
      "X-Request-Id",
      clientId,
    );
  });

  it("generates a UUID when the supplied ID exceeds the maximum length (128 chars)", () => {
    const longId = "a".repeat(129);
    const req = buildReq(longId);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
    expect(req.requestId).not.toBe(longId);
  });

  it("accepts a value of exactly 128 characters", () => {
    const exactId = "a".repeat(128);
    const req = buildReq(exactId);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toBe(exactId);
  });

  it("generates a UUID when the supplied ID contains unsafe characters", () => {
    const unsafeId = "<script>alert(1)</script>";
    const req = buildReq(unsafeId);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
  });

  it("generates a UUID when the supplied ID contains newlines (header injection attempt)", () => {
    const injectedId = "valid-id\r\nX-Injected: evil";
    const req = buildReq(injectedId);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
  });

  it("selects the first element when the header is provided as a string array", () => {
    const clientId = "first-id";
    const req = buildReq([clientId, "second-id"]);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toBe(clientId);
  });

  it("generates a UUID when the first array element is invalid", () => {
    const req = buildReq(["invalid/id!", "second-id"]);
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
  });

  it("generates a UUID when the header value is an empty string", () => {
    const req = buildReq("");
    const res = buildRes();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
  });

  it("always calls next()", () => {
    middleware.use(buildReq(), buildRes(), next);
    middleware.use(buildReq("bad id!"), buildRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});
