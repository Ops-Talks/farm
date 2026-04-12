import { Test, TestingModule } from "@nestjs/testing";
import { OpaController } from "./opa.controller";
import { OpaService } from "./opa.service";
import { OpaResult } from "./entities/opa-result.entity";
import { EvaluateOpaDto } from "./dto/evaluate-opa.dto";
import { OpaResultResponseDto } from "./dto/opa-result-response.dto";

describe("OpaController", () => {
  let controller: OpaController;
  let opaService: jest.Mocked<
    Pick<
      OpaService,
      "isReachable" | "evaluate" | "saveResult" | "listResults" | "getOpaUrl"
    >
  >;

  const mockOpaService = {
    isReachable: jest.fn().mockResolvedValue(true),
    getOpaUrl: jest.fn().mockReturnValue("http://localhost:8181"),
    evaluate: jest.fn().mockResolvedValue({ allowed: true, violations: [] }),
    saveResult: jest.fn().mockResolvedValue({} as OpaResult),
    listResults: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpaController],
      providers: [{ provide: OpaService, useValue: mockOpaService }],
    }).compile();

    controller = module.get<OpaController>(OpaController);
    opaService = mockOpaService;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // GET /opa/status
  // ---------------------------------------------------------------------------

  describe("getStatus", () => {
    it("should return reachable: true when OPA is available", async () => {
      opaService.isReachable.mockResolvedValue(true);
      opaService.getOpaUrl.mockReturnValue("http://localhost:8181");

      const result = await controller.getStatus();
      expect(result).toEqual({ reachable: true, url: "http://localhost:8181" });
    });

    it("should return reachable: false when OPA is unavailable", async () => {
      opaService.isReachable.mockResolvedValue(false);
      opaService.getOpaUrl.mockReturnValue("http://opa.svc:8181");

      const result = await controller.getStatus();
      expect(result.reachable).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /opa/evaluate
  // ---------------------------------------------------------------------------

  describe("evaluate", () => {
    it("should evaluate policy and return result without saving when no componentId", async () => {
      opaService.evaluate.mockResolvedValue({
        allowed: true,
        violations: [],
      });

      const dto: EvaluateOpaDto = {
        policyPath: "app/allow",
        input: { user: "alice" },
      };

      const result = await controller.evaluate(dto);
      expect(result).toEqual({
        policyPath: "app/allow",
        allowed: true,
        violations: [],
      });
      expect(opaService.evaluate).toHaveBeenCalledWith("app/allow", {
        user: "alice",
      });
      expect(opaService.saveResult).not.toHaveBeenCalled();
    });

    it("should save result when componentId is provided", async () => {
      opaService.evaluate.mockResolvedValue({
        allowed: false,
        violations: ["missing label"],
      });

      const dto: EvaluateOpaDto = {
        policyPath: "app/rbac",
        input: { resource: "deployment" },
        componentId: "comp-uuid-1",
      };

      const result = await controller.evaluate(dto);
      expect(result.allowed).toBe(false);
      expect(result.violations).toEqual(["missing label"]);
      expect(opaService.saveResult).toHaveBeenCalledWith(
        "comp-uuid-1",
        "app/rbac",
        { allowed: false, violations: ["missing label"] },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /opa/results/:componentId
  // ---------------------------------------------------------------------------

  describe("listResults", () => {
    it("should return results array mapped via OpaResultResponseDto", async () => {
      const now = new Date();
      const mockResults = [
        {
          id: "r1",
          componentId: "comp-1",
          policyPath: "app/allow",
          allowed: true,
          violations: [],
          evaluatedAt: now,
          createdAt: now,
          updatedAt: now,
        } as OpaResult,
      ];
      opaService.listResults.mockResolvedValue(mockResults);

      const result = await controller.listResults("comp-1");
      expect(opaService.listResults).toHaveBeenCalledWith("comp-1");
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(OpaResultResponseDto);
      expect(result[0].id).toBe("r1");
    });

    it("should return empty array when no results exist", async () => {
      opaService.listResults.mockResolvedValue([]);
      const result = await controller.listResults("unknown-comp");
      expect(result).toEqual([]);
    });
  });
});
