import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { TracesIngestController } from "./traces-ingest.controller";
import { of, throwError } from "rxjs";

// ---------------------------------------------------------------------------
// Helpers to create minimal Express-like request/response mocks
// ---------------------------------------------------------------------------

function makeReq(
  body: unknown = {},
  contentType = "application/json",
): Partial<Request> {
  return {
    body,
    headers: { "content-type": contentType } as unknown as Headers,
  } as Partial<Request>;
}

interface MockRes {
  _status: number;
  _body: unknown;
  status: (code: number) => MockRes;
  send: (body: unknown) => MockRes;
}

function makeRes(): MockRes {
  const res: MockRes = {
    _status: 0,
    _body: undefined,
    status(code: number) {
      this._status = code;
      return this;
    },
    send(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
};

describe("TracesIngestController", () => {
  let controller: TracesIngestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TracesIngestController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<TracesIngestController>(TracesIngestController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OTEL_EXPORTER_ENDPOINT;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST traces/ingest", () => {
    it("proxies the body to the configured collector and returns its status", async () => {
      // Arrange — observability stack is opt-in, so the controller only
      // forwards spans when OTEL_EXPORTER_ENDPOINT is configured.
      process.env.OTEL_EXPORTER_ENDPOINT = "http://localhost:4318/v1/traces";

      mockHttpService.post.mockReturnValue(
        of({ status: 200, statusText: "OK", data: "" }),
      );

      const req = makeReq({ resourceSpans: [] });
      const res = makeRes();

      // Act
      await controller.ingestTrace(
        req as unknown as import("express").Request,
        res as unknown as import("express").Response,
      );

      // Assert — forwarded to the configured Tempo endpoint
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://localhost:4318/v1/traces",
        { resourceSpans: [] },
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }) as unknown,
        }) as unknown,
      );
      expect(res._status).toBe(200);
    });

    it("returns 204 No Content and skips forwarding when no collector is configured", async () => {
      // Ensure env is unset for this test (afterEach also clears it)
      delete process.env.OTEL_EXPORTER_ENDPOINT;

      const req = makeReq({ resourceSpans: [] });
      const res = makeRes();

      await controller.ingestTrace(
        req as unknown as import("express").Request,
        res as unknown as import("express").Response,
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(res._status).toBe(204);
    });

    it("respects OTEL_EXPORTER_ENDPOINT env override", async () => {
      process.env.OTEL_EXPORTER_ENDPOINT = "http://tempo:4318/v1/traces";

      mockHttpService.post.mockReturnValue(
        of({ status: 200, statusText: "OK", data: "" }),
      );

      const req = makeReq({ resourceSpans: [] });
      const res = makeRes();

      await controller.ingestTrace(
        req as unknown as import("express").Request,
        res as unknown as import("express").Response,
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://tempo:4318/v1/traces",
        expect.anything(),
        expect.anything(),
      );
    });

    it("returns collector response status (e.g. 429 rate-limited)", async () => {
      process.env.OTEL_EXPORTER_ENDPOINT = "http://localhost:4318/v1/traces";

      mockHttpService.post.mockReturnValue(
        of({
          status: 429,
          statusText: "Too Many Requests",
          data: "rate limited",
        }),
      );

      const req = makeReq({});
      const res = makeRes();

      await controller.ingestTrace(
        req as unknown as import("express").Request,
        res as unknown as import("express").Response,
      );

      expect(res._status).toBe(429);
      expect(res._body).toBe("rate limited");
    });

    it("returns 502 Bad Gateway when the collector is unreachable", async () => {
      process.env.OTEL_EXPORTER_ENDPOINT = "http://localhost:4318/v1/traces";

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("connection refused")),
      );

      const req = makeReq({});
      const res = makeRes();

      await controller.ingestTrace(
        req as unknown as import("express").Request,
        res as unknown as import("express").Response,
      );

      expect(res._status).toBe(502);
    });
  });
});
