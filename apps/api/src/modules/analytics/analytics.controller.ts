import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AnalyticsService } from "./analytics.service";
import { CatalogAnalyticsDto } from "./dto/catalog-analytics.dto";
import { DoraAnalyticsDto } from "./dto/dora-analytics.dto";
import { UsageAnalyticsDto } from "./dto/usage-analytics.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OptionalOrgGuard } from "../../common/guards/optional-org.guard";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

/**
 * Serializes a flat array of record objects to a CSV string.
 * The first row is the header derived from the keys of the first record.
 *
 * @param rows - Array of plain objects to serialize
 * @returns The CSV string (LF line endings)
 */
function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Controller that exposes analytics endpoints for catalog health,
 * DORA metrics, and platform usage reports.
 *
 * All endpoints accept an optional X-Organization-Id header. When provided,
 * query results are scoped to that organization. Omitting the header returns
 * global (cross-organization) results for admin-level dashboards.
 */
@ApiTags("Analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OptionalOrgGuard)
@Controller("analytics")
@ApiHeader({
  name: "X-Organization-Id",
  description:
    "Optional organization UUID. When present, results are scoped to that organization.",
  required: false,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Returns catalog health analytics including ownership coverage,
   * lifecycle distribution, kind distribution, and unowned components.
   */
  @Get("catalog")
  @ApiOperation({ summary: "Get service catalog health analytics" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Catalog analytics successfully retrieved.",
    type: CatalogAnalyticsDto,
  })
  async getCatalogAnalytics(
    @Req() req: RequestWithOrg,
  ): Promise<CatalogAnalyticsDto> {
    return this.analyticsService.getCatalogAnalytics(req.organizationId);
  }

  /**
   * Returns DORA metrics for a given period with optional component and
   * environment filters.
   */
  @Get("dora")
  @ApiOperation({ summary: "Get DORA engineering metrics" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of days to look back (default: 30)",
    example: 30,
  })
  @ApiQuery({
    name: "componentId",
    required: false,
    type: String,
    description: "Filter metrics by component UUID",
  })
  @ApiQuery({
    name: "environmentId",
    required: false,
    type: String,
    description: "Filter metrics by environment UUID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "DORA metrics successfully retrieved.",
    type: DoraAnalyticsDto,
  })
  async getDoraMetrics(
    @Req() req: RequestWithOrg,
    @Query("days") days = 30,
    @Query("componentId") componentId?: string,
    @Query("environmentId") environmentId?: string,
  ): Promise<DoraAnalyticsDto> {
    const periodDays = Number(days);
    return this.analyticsService.getDoraMetrics(
      periodDays,
      componentId,
      environmentId,
      req.organizationId,
    );
  }

  /**
   * Returns platform usage analytics derived from the audit log including
   * top components, most active users, and action breakdown.
   */
  @Get("usage")
  @ApiOperation({ summary: "Get platform usage analytics" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of days to look back (default: 30)",
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Usage analytics successfully retrieved.",
    type: UsageAnalyticsDto,
  })
  async getUsageAnalytics(
    @Req() req: RequestWithOrg,
    @Query("days") days = 30,
  ): Promise<UsageAnalyticsDto> {
    const periodDays = Number(days);
    return this.analyticsService.getUsageAnalytics(
      periodDays,
      req.organizationId,
    );
  }

  /**
   * Exports an analytics report as a CSV file attachment.
   * Supported report types: catalog, dora, usage.
   */
  @Get("export")
  @ApiOperation({ summary: "Export analytics report as CSV" })
  @ApiQuery({
    name: "report",
    required: true,
    enum: ["catalog", "dora", "usage"],
    description: "The type of report to export",
  })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description:
      "Number of days to look back for dora/usage reports (default: 30)",
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "CSV file attachment.",
    content: { "text/csv": {} },
  })
  async exportReport(
    @Query("report") report: "catalog" | "dora" | "usage",
    @Query("days") days = 30,
    @Req() req: RequestWithOrg,
    @Res() res: Response,
  ): Promise<void> {
    const periodDays = Number(days);
    const orgId = req.organizationId;
    const date = new Date().toISOString().split("T")[0];
    const filename = `farm-${report}-${date}.csv`;

    let csv = "";

    if (report === "catalog") {
      const data = await this.analyticsService.getCatalogAnalytics(orgId);

      const rows: Record<string, string | number>[] = [
        {
          Section: "Ownership",
          Metric: "Total",
          Value: data.ownershipCoverage.total,
        },
        {
          Section: "Ownership",
          Metric: "With Owner",
          Value: data.ownershipCoverage.withOwner,
        },
        {
          Section: "Ownership",
          Metric: "Without Owner",
          Value: data.ownershipCoverage.withoutOwner,
        },
        {
          Section: "Ownership",
          Metric: "Coverage %",
          Value: data.ownershipCoverage.coveragePercent,
        },
        ...data.lifecycleDistribution.map((lc) => ({
          Section: "Lifecycle",
          Metric: lc.lifecycle,
          Value: lc.count,
        })),
        ...data.kindDistribution.map((k) => ({
          Section: "Kind",
          Metric: k.kind,
          Value: k.count,
        })),
      ];

      csv = toCsv(rows);
    } else if (report === "dora") {
      const data = await this.analyticsService.getDoraMetrics(
        periodDays,
        undefined,
        undefined,
        orgId,
      );

      const rows: Record<string, string | number>[] = [
        { Metric: "Period Days", Value: data.periodDays },
        {
          Metric: "Deployment Frequency (per day)",
          Value: data.deploymentFrequency.deploymentsPerDay,
        },
        {
          Metric: "Deployment Frequency (total)",
          Value: data.deploymentFrequency.total,
        },
        {
          Metric: "Change Failure Rate (%)",
          Value: data.changeFailureRate.rate,
        },
        {
          Metric: "Change Failure Rate (failed)",
          Value: data.changeFailureRate.failed,
        },
        {
          Metric: "Change Failure Rate (total)",
          Value: data.changeFailureRate.total,
        },
        {
          Metric: "Mean Time to Recovery (avg hours)",
          Value: data.meanTimeToRecovery.avgHours,
        },
        {
          Metric: "Mean Time to Recovery (samples)",
          Value: data.meanTimeToRecovery.samples,
        },
        {
          Metric: "Lead Time for Changes (avg hours)",
          Value: data.leadTimeForChanges.avgHours,
        },
        {
          Metric: "Lead Time for Changes (samples)",
          Value: data.leadTimeForChanges.samples,
        },
      ];

      csv = toCsv(rows);
    } else {
      const data = await this.analyticsService.getUsageAnalytics(
        periodDays,
        orgId,
      );

      const componentRows: Record<string, string | number>[] =
        data.topComponents.map((c) => ({
          Section: "Top Components",
          Key: c.componentId,
          Label: c.componentName,
          Count: c.accessCount,
        }));

      const userRows: Record<string, string | number>[] = data.activeUsers.map(
        (u) => ({
          Section: "Active Users",
          Key: u.actorId,
          Label: u.actorUsername,
          Count: u.actionCount,
        }),
      );

      csv = toCsv([...componentRows, ...userRows]);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }
}
