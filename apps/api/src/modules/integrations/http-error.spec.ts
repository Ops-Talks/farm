import {
  BadGatewayException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { AxiosError, AxiosHeaders } from "axios";
import { translateHttpError } from "./http-error";

function makeAxiosError(
  status?: number,
  opts: { code?: string; url?: string } = {},
): AxiosError {
  const err = new AxiosError(
    `Request failed${status ? ` with status ${status}` : ""}`,
    opts.code ?? "ERR_NETWORK",
    { url: opts.url, headers: new AxiosHeaders() } as never,
    undefined,
    status
      ? ({
          status,
          data: {},
          headers: {},
          config: { url: opts.url, headers: new AxiosHeaders() } as never,
          statusText: String(status),
        } as never)
      : undefined,
  );
  return err;
}

describe("translateHttpError()", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger("test");
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("fetch() TypeError (network failure)", () => {
    it("throws ServiceUnavailableException for TypeError", () => {
      const err = new TypeError("Failed to fetch");

      expect(() =>
        translateHttpError(err, "TestService.op", logger),
      ).toThrow(ServiceUnavailableException);
    });

    it("includes the operation name in the exception message", () => {
      const err = new TypeError("connection refused");

      expect(() =>
        translateHttpError(err, "MyService.call", logger),
      ).toThrow("MyService.call");
    });

    it("logs an error before throwing for TypeError", () => {
      const err = new TypeError("connection refused");

      expect(() =>
        translateHttpError(err, "TestService.op", logger),
      ).toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        "TestService.op: service unreachable",
        expect.objectContaining({ message: "connection refused" }),
      );
    });
  });

  describe("Axios error — network failure (no response)", () => {
    it("throws ServiceUnavailableException when there is no response", () => {
      const err = makeAxiosError(undefined, { code: "ECONNREFUSED" });

      expect(() =>
        translateHttpError(err, "TestService.op", logger),
      ).toThrow(ServiceUnavailableException);
    });
  });

  describe("Axios error — HTTP status codes", () => {
    it("throws UnauthorizedException for 401", () => {
      expect(() =>
        translateHttpError(makeAxiosError(401), "TestService.op", logger),
      ).toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException for 403", () => {
      expect(() =>
        translateHttpError(makeAxiosError(403), "TestService.op", logger),
      ).toThrow(UnauthorizedException);
    });

    it("throws NotFoundException for 404", () => {
      expect(() =>
        translateHttpError(makeAxiosError(404), "TestService.op", logger),
      ).toThrow(NotFoundException);
    });

    it("throws BadGatewayException for 500 upstream", () => {
      expect(() =>
        translateHttpError(makeAxiosError(500), "TestService.op", logger),
      ).toThrow(BadGatewayException);
    });

    it("throws BadGatewayException for 429 upstream", () => {
      expect(() =>
        translateHttpError(makeAxiosError(429), "TestService.op", logger),
      ).toThrow(BadGatewayException);
    });

    it("includes the HTTP status in the BadGateway message", () => {
      expect(() =>
        translateHttpError(makeAxiosError(503), "SomeService.call", logger),
      ).toThrow(/503/);
    });
  });

  describe("non-Axios, non-TypeError errors", () => {
    it("throws InternalServerErrorException for a plain Error", () => {
      const err = new Error("something went wrong");

      expect(() =>
        translateHttpError(err, "TestService.op", logger),
      ).toThrow(InternalServerErrorException);
    });

    it("throws InternalServerErrorException for a string error", () => {
      expect(() =>
        translateHttpError("unexpected string", "TestService.op", logger),
      ).toThrow(InternalServerErrorException);
    });

    it("logs details before throwing for an unexpected error", () => {
      const err = new Error("unknown failure");

      expect(() =>
        translateHttpError(err, "TestService.op", logger),
      ).toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        "TestService.op: unexpected error",
        expect.objectContaining({ error: "unknown failure" }),
      );
    });
  });
});
