import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { OpenCostService } from "./open-cost.service";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
import { of } from "rxjs";

describe("OpenCostService", () => {
  let service: OpenCostService;
  let mockHttpService: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
    patch: jest.Mock;
  };

  beforeEach(async () => {
    mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenCostService,
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === "OPENCOST_URL") return "http://opencost.test:9090";
              return defaultVal ?? "";
            }),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: { fire: jest.fn((_, fn: () => unknown) => fn()) },
        },
      ],
    }).compile();

    service = module.get<OpenCostService>(OpenCostService);
  });

  // -------------------------------------------------------------------------
  describe("getAllocation()", () => {
    it("returns a parsed allocation when OpenCost responds successfully", async () => {
      const mockData = {
        data: {
          "my-app": {
            cpuCost: 1.5,
            memoryCost: 0.8,
            pvCost: 0.2,
            networkCost: 0.1,
            totalCost: 2.6,
            currency: "USD",
          },
        },
      };

      mockHttpService.get.mockReturnValue(
        of({
          data: mockData,
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const result = await service.getAllocation("my-app", "30d");

      expect(result).toEqual({
        cpuCost: 1.5,
        memoryCost: 0.8,
        pvCost: 0.2,
        networkCost: 0.1,
        totalCost: 2.6,
        currency: "USD",
      });
    });

    it("returns null when the HTTP response is not OK", async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {},
          status: 503,
          statusText: "Service Unavailable",
          headers: {},
          config: {},
        }),
      );

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when data is absent from the response", async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when data object is empty", async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: { data: {} },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when fetch throws a non-Error value", async () => {
      mockHttpService.get.mockImplementation(() => {
        throw new Error("network timeout");
      });

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("returns null when fetch throws an Error", async () => {
      mockHttpService.get.mockImplementation(() => {
        throw new Error("ECONNREFUSED");
      });

      const result = await service.getAllocation("my-app", "30d");
      expect(result).toBeNull();
    });

    it("URL-encodes labelSelector and window params", async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: { data: {} },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      await service.getAllocation("my app/special", "7d&extra=1");

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("filterLabels=app:my%20app%2Fspecial"),
        expect.any(Object),
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("window=7d%26extra%3D1"),
        expect.any(Object),
      );
    });
  });
});
