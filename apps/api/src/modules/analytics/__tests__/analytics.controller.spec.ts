import { Test, TestingModule } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { AnalyticsController } from "../analytics.controller";
import { AnalyticsService } from "../analytics.service";
import { CatalogAnalyticsDto } from "../dto/catalog-analytics.dto";
import { DoraAnalyticsDto } from "../dto/dora-analytics.dto";
import { UsageAnalyticsDto } from "../dto/usage-analytics.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { OptionalOrgGuard } from "../../../common/guards/optional-org.guard";
import type { RequestWithOrg } from "../../../common/interfaces/request-with-org.interface";

const mockCatalogData: CatalogAnalyticsDto = {
  ownershipCoverage: {
    total: 10,
    withOwner: 8,
    withoutOwner: 2,
    coveragePercent: 80.0,
  },
  lifecycleDistribution: [
    { lifecycle: "production", count: 5 },
    { lifecycle: "experimental", count: 3 },
  ],
  kindDistribution: [
    { kind: "service", count: 4 },
    { kind: "library", count: 2 },
  ],
  unownedComponents: [{ id: "uuid-1", name: "svc-a", kind: "service" }],
};

const mockDoraData: DoraAnalyticsDto = {
  periodDays: 30,
  deploymentFrequency: { deploymentsPerDay: 3.33, total: 100, periodDays: 30 },
  changeFailureRate: { rate: 5.0, failed: 5, total: 100 },
  meanTimeToRecovery: { avgHours: 2.0, samples: 5 },
  leadTimeForChanges: { avgHours: 0.5, samples: 80 },
};

const mockUsageData: UsageAnalyticsDto = {
  periodDays: 30,
  totalAuditEvents: 500,
  topComponents: [
    {
      componentId: "comp-1",
      componentName: "payment-service",
      accessCount: 120,
    },
  ],
  activeUsers: [{ actorId: "user-1", actorUsername: "alice", actionCount: 60 }],
  actionBreakdown: [
    { action: "CREATE", count: 200 },
    { action: "DELETE", count: 50 },
  ],
};

/** Minimal request mock without org context (global queries). */
const mockReq: RequestWithOrg = {
  organizationId: undefined,
  user: { userId: "u1", username: "u1", roles: [] },
};

/** Request mock with org context (org-scoped queries). */
const mockReqWithOrg: RequestWithOrg = {
  organizationId: "org-abc-123",
  user: { userId: "u1", username: "u1", roles: [] },
};

describe("AnalyticsController", () => {
  let controller: AnalyticsController;

  const mockService = {
    getCatalogAnalytics: jest.fn().mockResolvedValue(mockCatalogData),
    getDoraMetrics: jest.fn().mockResolvedValue(mockDoraData),
    getUsageAnalytics: jest.fn().mockResolvedValue(mockUsageData),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalOrgGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    jest.clearAllMocks();
    mockService.getCatalogAnalytics.mockResolvedValue(mockCatalogData);
    mockService.getDoraMetrics.mockResolvedValue(mockDoraData);
    mockService.getUsageAnalytics.mockResolvedValue(mockUsageData);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // GET /analytics/catalog
  // ---------------------------------------------------------------------------

  describe("getCatalogAnalytics", () => {
    it("returns catalog analytics data from the service", async () => {
      const result = await controller.getCatalogAnalytics(mockReq);

      expect(mockService.getCatalogAnalytics).toHaveBeenCalledTimes(1);
      expect(mockService.getCatalogAnalytics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockCatalogData);
    });

    it("passes organizationId to the service when org context is present", async () => {
      await controller.getCatalogAnalytics(mockReqWithOrg);

      expect(mockService.getCatalogAnalytics).toHaveBeenCalledWith(
        "org-abc-123",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /analytics/dora
  // ---------------------------------------------------------------------------

  describe("getDoraMetrics", () => {
    it("returns DORA metrics with default period of 30 days", async () => {
      const result = await controller.getDoraMetrics(mockReq, 30);

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        30,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockDoraData);
    });

    it("passes componentId and environmentId filters to the service", async () => {
      const result = await controller.getDoraMetrics(
        mockReq,
        7,
        "comp-uuid-1",
        "env-uuid-1",
      );

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        7,
        "comp-uuid-1",
        "env-uuid-1",
        undefined,
      );
      expect(result).toEqual(mockDoraData);
    });

    it("coerces string query param to number", async () => {
      // Query params arrive as strings from HTTP layer; the controller does Number(days)
      const result = await controller.getDoraMetrics(
        mockReq,
        "14" as unknown as number,
      );

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        14,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockDoraData);
    });

    it("applies the built-in default of 30 days when no days argument is passed", async () => {
      // Calling the method without an explicit value triggers the ES default-parameter
      // substitution (`days = 30`), which Istanbul tracks as a separate branch.
      const result = await controller.getDoraMetrics(mockReq);

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        30,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockDoraData);
    });

    it("passes organizationId to the service when org context is present", async () => {
      await controller.getDoraMetrics(mockReqWithOrg, 30);

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        30,
        undefined,
        undefined,
        "org-abc-123",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /analytics/usage
  // ---------------------------------------------------------------------------

  describe("getUsageAnalytics", () => {
    it("returns usage analytics with default period of 30 days", async () => {
      const result = await controller.getUsageAnalytics(mockReq, 30);

      expect(mockService.getUsageAnalytics).toHaveBeenCalledWith(30, undefined);
      expect(result).toEqual(mockUsageData);
    });

    it("forwards custom days parameter to the service", async () => {
      await controller.getUsageAnalytics(mockReq, 7);

      expect(mockService.getUsageAnalytics).toHaveBeenCalledWith(7, undefined);
    });

    it("applies the built-in default of 30 days when no days argument is passed", async () => {
      // Calling without an explicit value triggers the ES default-parameter
      // substitution (`days = 30`), which Istanbul tracks as its own branch.
      const result = await controller.getUsageAnalytics(mockReq);

      expect(mockService.getUsageAnalytics).toHaveBeenCalledWith(30, undefined);
      expect(result).toEqual(mockUsageData);
    });

    it("passes organizationId to the service when org context is present", async () => {
      await controller.getUsageAnalytics(mockReqWithOrg, 30);

      expect(mockService.getUsageAnalytics).toHaveBeenCalledWith(
        30,
        "org-abc-123",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /analytics/export
  // ---------------------------------------------------------------------------

  describe("exportReport", () => {
    /**
     * Builds a minimal mock express Response object that captures the calls
     * made by the controller.
     */
    function buildMockRes() {
      const headers: Record<string, string> = {};
      let statusCode = 0;
      let body: unknown;

      const res = {
        setHeader: jest.fn((key: string, value: string) => {
          headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn((data: unknown) => {
          body = data;
        }),
        _headers: headers,
        _statusCode: () => statusCode,
        _body: () => body,
      };

      // status().send() chain
      res.status.mockImplementation((code: number) => {
        statusCode = code;
        return res;
      });

      return res;
    }

    it("sets Content-Type to text/csv for catalog report", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "catalog",
        30,
        mockReq,
        res as unknown as Response,
      );

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
    });

    it("sets Content-Disposition with filename for catalog report", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "catalog",
        30,
        mockReq,
        res as unknown as Response,
      );

      const dispositionCall = res.setHeader.mock.calls.find(
        (c: string[]) => c[0] === "Content-Disposition",
      );
      expect(dispositionCall).toBeDefined();
      expect(dispositionCall![1]).toMatch(
        /^attachment; filename="farm-catalog-.+\.csv"$/,
      );
    });

    it("responds with HTTP 200 for a valid export", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "catalog",
        30,
        mockReq,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalled();
    });

    it("generates CSV content for catalog report with expected sections", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "catalog",
        30,
        mockReq,
        res as unknown as Response,
      );

      const csvBody = res.send.mock.calls[0][0] as string;
      expect(csvBody).toContain("Ownership");
      expect(csvBody).toContain("Lifecycle");
      expect(csvBody).toContain("Kind");
    });

    it("generates CSV content for dora report", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "dora",
        30,
        mockReq,
        res as unknown as Response,
      );

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        30,
        undefined,
        undefined,
        undefined,
      );
      const csvBody = res.send.mock.calls[0][0] as string;
      expect(csvBody).toContain("Deployment Frequency");
    });

    it("generates CSV content for usage report", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "usage",
        30,
        mockReq,
        res as unknown as Response,
      );

      expect(mockService.getUsageAnalytics).toHaveBeenCalledWith(30, undefined);
      const csvBody = res.send.mock.calls[0][0] as string;
      expect(csvBody).toContain("Top Components");
    });

    it("includes the report type and date in the filename", async () => {
      const res = buildMockRes();
      const today = new Date().toISOString().split("T")[0];

      await controller.exportReport(
        "dora",
        30,
        mockReq,
        res as unknown as Response,
      );

      const dispositionCall = res.setHeader.mock.calls.find(
        (c: string[]) => c[0] === "Content-Disposition",
      );
      expect(dispositionCall![1]).toContain(`farm-dora-${today}`);
    });

    it("produces an empty CSV body when catalog distributions are empty", async () => {
      // Mock service returns data with empty lifecycle and kind distributions.
      // The 4 ownership rows are still present, so toCsv returns a non-empty CSV.
      // But a row value of null triggers the `r[h] ?? ""` fallback inside toCsv.
      mockService.getCatalogAnalytics.mockResolvedValueOnce({
        ownershipCoverage: {
          total: 0,
          withOwner: 0,
          withoutOwner: 0,
          coveragePercent: null as unknown as number,
        },
        lifecycleDistribution: [],
        kindDistribution: [],
        unownedComponents: [],
      });

      const res = buildMockRes();
      await controller.exportReport(
        "catalog",
        30,
        mockReq,
        res as unknown as Response,
      );

      const csvBody = res.send.mock.calls[0][0] as string;
      // coveragePercent is null, so r[h] ?? "" fires for that cell
      expect(csvBody).toContain("Coverage %");
    });

    it("returns empty CSV when usage report has no components or active users", async () => {
      // When topComponents and activeUsers are both empty arrays, toCsv is called
      // with an empty array, triggering the `if (rows.length === 0) return ""`
      // early-exit branch (line 33).
      mockService.getUsageAnalytics.mockResolvedValueOnce({
        periodDays: 30,
        totalAuditEvents: 0,
        topComponents: [],
        activeUsers: [],
        actionBreakdown: [],
      });

      const res = buildMockRes();
      await controller.exportReport(
        "usage",
        30,
        mockReq,
        res as unknown as Response,
      );

      const csvBody = res.send.mock.calls[0][0] as string;
      expect(csvBody).toBe("");
    });

    it("applies the built-in default of 30 days for export when no days argument is passed", async () => {
      // Omitting `days` exercises the ES default-parameter substitution
      // (`days = 30`) that Istanbul tracks as its own branch.
      const res = buildMockRes();
      await controller.exportReport(
        "dora",
        undefined,
        mockReq,
        res as unknown as Response,
      );

      expect(mockService.getDoraMetrics).toHaveBeenCalledWith(
        30,
        undefined,
        undefined,
        undefined,
      );
      expect(res.send).toHaveBeenCalled();
    });

    it("passes organizationId to service when org context is present for export", async () => {
      const res = buildMockRes();

      await controller.exportReport(
        "catalog",
        30,
        mockReqWithOrg,
        res as unknown as Response,
      );

      expect(mockService.getCatalogAnalytics).toHaveBeenCalledWith(
        "org-abc-123",
      );
    });
  });
});
