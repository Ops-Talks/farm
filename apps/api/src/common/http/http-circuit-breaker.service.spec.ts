import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { ServiceUnavailableException } from "@nestjs/common";
import { HttpCircuitBreakerService } from "./http-circuit-breaker.service";
import { CircuitBreakerService } from "../circuit-breaker/circuit-breaker.service";
import { of, throwError, firstValueFrom } from "rxjs";

const CIRCUIT_STATE_TOKEN = "PROM_METRIC_INTEGRATION_CIRCUIT_STATE";

function mockAxiosResponse(data: unknown, status = 200) {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config: {} as Record<string, never>,
  };
}

describe("HttpCircuitBreakerService", () => {
  let service: HttpCircuitBreakerService;
  let httpService: jest.Mocked<HttpService>;
  let circuitBreaker: CircuitBreakerService;
  let mockGauge: { set: jest.Mock };

  beforeEach(async () => {
    mockGauge = { set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpCircuitBreakerService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
          },
        },
        CircuitBreakerService,
        {
          provide: CIRCUIT_STATE_TOKEN,
          useValue: mockGauge,
        },
      ],
    }).compile();

    service = module.get(HttpCircuitBreakerService);
    httpService = module.get(HttpService);
    circuitBreaker = module.get(CircuitBreakerService);
  });

  describe("get", () => {
    it("returns the response from a successful call", async () => {
      const response = mockAxiosResponse({ items: [] });
      httpService.get.mockReturnValue(of(response));

      const result = await firstValueFrom(
        service.get("test-integration", "https://example.com/api"),
      );

      expect(result).toEqual(response);
      expect(httpService.get).toHaveBeenCalledWith(
        "https://example.com/api",
        undefined,
      );
    });

    it("passes request config to HttpService", async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse(null)));

      await firstValueFrom(
        service.get("test", "https://example.com", {
          headers: { Authorization: "Bearer x" },
          timeout: 5000,
        }),
      );

      expect(httpService.get).toHaveBeenCalledWith("https://example.com", {
        headers: { Authorization: "Bearer x" },
        timeout: 5000,
      });
    });

    it("throws ServiceUnavailableException when circuit is open", async () => {
      httpService.get.mockReturnValue(of(mockAxiosResponse(null)));
      await firstValueFrom(
        service.get("open-circuit-test", "https://example.com"),
      );

      circuitBreaker.getBreakers().get("open-circuit-test")!.open();
      httpService.get.mockReturnValue(of(mockAxiosResponse(null)));

      await expect(
        firstValueFrom(service.get("open-circuit-test", "https://example.com")),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it("propagates errors from the underlying HTTP call", async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error("connection refused")),
      );

      await expect(
        firstValueFrom(service.get("error-test", "https://example.com")),
      ).rejects.toThrow("connection refused");
    });
  });

  describe("post", () => {
    it("sends data and returns response", async () => {
      const response = mockAxiosResponse({ id: 1 });
      httpService.post.mockReturnValue(of(response));

      const result = await firstValueFrom(
        service.post("test", "https://example.com", { name: "foo" }),
      );

      expect(result).toEqual(response);
      expect(httpService.post).toHaveBeenCalledWith(
        "https://example.com",
        { name: "foo" },
        undefined,
      );
    });
  });

  describe("put", () => {
    it("sends data and returns response", async () => {
      const response = mockAxiosResponse({ updated: true });
      httpService.put.mockReturnValue(of(response));

      const result = await firstValueFrom(
        service.put("test", "https://example.com/1", { name: "bar" }),
      );

      expect(result).toEqual(response);
      expect(httpService.put).toHaveBeenCalledWith(
        "https://example.com/1",
        { name: "bar" },
        undefined,
      );
    });
  });

  describe("patch", () => {
    it("sends data and returns response", async () => {
      const response = mockAxiosResponse({ patched: true });
      httpService.patch.mockReturnValue(of(response));

      const result = await firstValueFrom(
        service.patch("test", "https://example.com/1", { name: "baz" }),
      );

      expect(result).toEqual(response);
      expect(httpService.patch).toHaveBeenCalledWith(
        "https://example.com/1",
        { name: "baz" },
        undefined,
      );
    });
  });

  describe("delete", () => {
    it("returns response", async () => {
      const response = mockAxiosResponse(null, 204);
      httpService.delete.mockReturnValue(of(response));

      const result = await firstValueFrom(
        service.delete("test", "https://example.com/1"),
      );

      expect(result).toEqual(response);
      expect(httpService.delete).toHaveBeenCalledWith(
        "https://example.com/1",
        undefined,
      );
    });
  });

  describe("raw", () => {
    it("exposes the underlying HttpService", () => {
      expect(service.raw).toBe(httpService);
    });
  });
});
