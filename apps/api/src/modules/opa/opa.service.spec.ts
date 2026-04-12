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
        ok: true,
        status: 200,
        text: jest
          .fn()
          .mockResolvedValue(JSON.stringify({ result: { allow: true } })),
      });

      const result = await service.evaluate("app/rbac/allow", {
        user: "alice",
      });
      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("should return violations when OPA returns them", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            result: { allow: false, violations: ["missing label env"] },
          }),
        ),
      });

      const result = await service.evaluate("app/policy", { resource: {} });
      expect(result.allowed).toBe(false);
      expect(result.violations).toEqual(["missing label env"]);
    });

    it("should handle OPA returning a plain boolean result (true)", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify({ result: true })),
      });

      const result = await service.evaluate("app/allow", {});
      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("should handle OPA returning a plain boolean result (false)", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify({ result: false })),
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
        ok: true,
        status: 200,
        text: jest
          .fn()
          .mockResolvedValue(JSON.stringify({ result: { allowed: true } })),
      });

      const result = await service.evaluate("app/allow", {});
      expect(result.allowed).toBe(true);
    });

    it("should throw BadRequestException when OPA returns non-2xx status", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue("policy not found"),
      });

      await expect(service.evaluate("app/missing", {})).rejects.toThrow(
        "OPA policy evaluation failed with status 404: policy not found",
      );
    });

    it("should throw BadRequestException when OPA returns non-2xx with empty body", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue(""),
      });

      await expect(service.evaluate("app/allow", {})).rejects.toThrow(
        "OPA policy evaluation failed with status 500",
      );
    });

    it("should throw BadRequestException when OPA returns invalid JSON", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue("<html>not json</html>"),
      });

      await expect(service.evaluate("app/allow", {})).rejects.toThrow(
        "OPA policy evaluation returned invalid JSON with status 200",
      );
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

  // ---------------------------------------------------------------------------
  // sanitizePolicyPath (exercised via evaluate)
  // ---------------------------------------------------------------------------

  describe("policyPath validation", () => {
    it("should throw BadRequestException when policyPath is empty", async () => {
      await expect(service.evaluate("", {})).rejects.toThrow(
        "policyPath must not be empty",
      );
    });

    it("should throw BadRequestException when policyPath starts with /", async () => {
      await expect(service.evaluate("/app/allow", {})).rejects.toThrow(
        "policyPath must not start or end with '/'",
      );
    });

    it("should throw BadRequestException when policyPath ends with /", async () => {
      await expect(service.evaluate("app/allow/", {})).rejects.toThrow(
        "policyPath must not start or end with '/'",
      );
    });

    it("should throw BadRequestException when policyPath contains a '..' segment", async () => {
      await expect(service.evaluate("app/../etc/passwd", {})).rejects.toThrow(
        "policyPath contains invalid segments",
      );
    });

    it("should throw BadRequestException when policyPath contains a '.' segment", async () => {
      await expect(service.evaluate("app/./allow", {})).rejects.toThrow(
        "policyPath contains invalid segments",
      );
    });

    it("should throw BadRequestException when policyPath has an empty segment (double slash)", async () => {
      await expect(service.evaluate("app//allow", {})).rejects.toThrow(
        "policyPath contains invalid segments",
      );
    });

    it("should throw BadRequestException when policyPath segment has invalid characters", async () => {
      await expect(service.evaluate("app/foo@bar", {})).rejects.toThrow(
        "policyPath may only contain letters, numbers, '_' and '-' per segment",
      );
    });
  });

  describe("evaluate — edge cases", () => {
    it("should return allowed: false when OPA returns no result field", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(JSON.stringify({})),
      });

      const result = await service.evaluate("app/allow", {});
      expect(result.allowed).toBe(false);
      expect(result.violations).toEqual([]);
    });
  });
});
