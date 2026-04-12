import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { OpaService } from "./opa.service";
import { OpaResult } from "./entities/opa-result.entity";

describe("OpaService", () => {
  let service: OpaService;

  let originalFetch: typeof globalThis.fetch;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue("http://localhost:8181"),
  };

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(OpaResult), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OpaService>(OpaService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // isReachable
  // ---------------------------------------------------------------------------

  describe("isReachable", () => {
    it("should return true when OPA health endpoint responds with 200", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({ status: 200 });
      const result = await service.isReachable();
      expect(result).toBe(true);
    });

    it("should return false when OPA health endpoint responds with non-200", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({ status: 503 });
      const result = await service.isReachable();
      expect(result).toBe(false);
    });

    it("should return false when fetch throws", async () => {
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));
      const result = await service.isReachable();
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // evaluate
  // ---------------------------------------------------------------------------

  describe("evaluate", () => {
    it("should return allowed: true when OPA returns { result: { allow: true } }", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ result: { allow: true } }),
      });

      const result = await service.evaluate("app/rbac/allow", {
        user: "alice",
      });
      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("should return violations when OPA returns them", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          result: { allow: false, violations: ["missing label env"] },
        }),
      });

      const result = await service.evaluate("app/policy", { resource: {} });
      expect(result.allowed).toBe(false);
      expect(result.violations).toEqual(["missing label env"]);
    });

    it("should handle OPA returning a plain boolean result (true)", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ result: true }),
      });

      const result = await service.evaluate("app/allow", {});
      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("should handle OPA returning a plain boolean result (false)", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ result: false }),
      });

      const result = await service.evaluate("app/allow", {});
      expect(result.allowed).toBe(false);
    });

    it("should re-throw when fetch throws", async () => {
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error("OPA unreachable"));
      await expect(service.evaluate("app/allow", {})).rejects.toThrow(
        "OPA unreachable",
      );
    });

    it("should handle result with allowed field instead of allow", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ result: { allowed: true } }),
      });

      const result = await service.evaluate("app/allow", {});
      expect(result.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // saveResult
  // ---------------------------------------------------------------------------

  describe("saveResult", () => {
    it("should create and save an OpaResult entity", async () => {
      const mockEntity = {
        id: "uuid-1",
        componentId: "comp-1",
        policyPath: "app/allow",
        allowed: true,
        violations: [],
        evaluatedAt: new Date(),
      } as OpaResult;

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.saveResult("comp-1", "app/allow", {
        allowed: true,
        violations: [],
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: "comp-1",
          policyPath: "app/allow",
          allowed: true,
          violations: [],
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toBe(mockEntity);
    });
  });

  // ---------------------------------------------------------------------------
  // listResults
  // ---------------------------------------------------------------------------

  describe("listResults", () => {
    it("should query repository with componentId filter", async () => {
      const mockResults = [{ id: "r1" } as OpaResult];
      mockRepository.find.mockResolvedValue(mockResults);

      const result = await service.listResults("comp-abc");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { componentId: "comp-abc" },
        }),
      );
      expect(result).toBe(mockResults);
    });
  });
});
