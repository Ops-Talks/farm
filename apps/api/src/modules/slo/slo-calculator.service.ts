import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SloService } from "./slo.service";
import { Slo, SloMetricType, SloWindow } from "./entities/slo.entity";
import {
  SloBudgetResponseDto,
  SloBudgetStatus,
} from "./dto/slo-budget-response.dto";

/**
 * Maps SLO window enum values to their duration in days.
 */
const WINDOW_DAYS: Record<SloWindow, number> = {
  [SloWindow.SEVEN_DAYS]: 7,
  [SloWindow.THIRTY_DAYS]: 30,
  [SloWindow.NINETY_DAYS]: 90,
};

/**
 * Service responsible for computing SLO error budgets by querying
 * Prometheus or returning simulated data when Prometheus is unavailable.
 */
@Injectable()
export class SloCalculatorService {
  private readonly logger = new Logger(SloCalculatorService.name);
  private readonly prometheusUrl: string | undefined;

  constructor(
    private readonly sloService: SloService,
    private readonly configService: ConfigService,
  ) {
    this.prometheusUrl = this.configService.get<string>("PROMETHEUS_URL");
  }

  /**
   * Calculates the error budget for a given SLO.
   *
   * When a Prometheus URL is configured, this method queries the
   * Prometheus HTTP API to compute the current metric value. Otherwise
   * it returns simulated data suitable for development environments.
   *
   * @param sloId - The UUID of the SLO
   * @returns The computed budget response
   */
  async calculateBudget(sloId: string): Promise<SloBudgetResponseDto> {
    const slo = await this.sloService.findOne(sloId);

    const windowDays = WINDOW_DAYS[slo.window];
    const windowEnd = new Date();
    const windowStart = new Date(
      windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000,
    );

    const currentPercent = await this.queryMetric(slo, windowStart, windowEnd);

    const targetPercent = Number(slo.targetPercent);
    const budgetTotal = Math.round((100 - targetPercent) * 10000) / 10000;
    const rawConsumed = Math.max(0, 100 - currentPercent);
    const budgetConsumed = Math.round(Math.min(rawConsumed, budgetTotal) * 10000) / 10000;
    const budgetRemaining =
      budgetTotal > 0
        ? Math.max(0, ((budgetTotal - budgetConsumed) / budgetTotal) * 100)
        : 0;

    // Calculate the elapsed fraction of the window
    const elapsedMs = windowEnd.getTime() - windowStart.getTime();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const elapsedFraction = windowMs > 0 ? elapsedMs / windowMs : 1;

    const budgetConsumedFraction =
      budgetTotal > 0 ? rawConsumed / budgetTotal : 0;
    const burnRate =
      elapsedFraction > 0 ? budgetConsumedFraction / elapsedFraction : 0;

    const status = this.determineBudgetStatus(budgetRemaining);

    return {
      sloId: slo.id,
      name: slo.name,
      targetPercent,
      currentPercent: Math.round(currentPercent * 100) / 100,
      budgetTotal,
      budgetConsumed,
      budgetRemaining: Math.round(budgetRemaining * 100) / 100,
      burnRate: Math.round(burnRate * 100) / 100,
      status,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    };
  }

  /**
   * Queries Prometheus for the current metric value. Falls back to
   * simulated data when Prometheus is not configured.
   */
  private async queryMetric(
    slo: Slo,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<number> {
    if (!this.prometheusUrl) {
      this.logger.warn(
        "PROMETHEUS_URL not configured; returning simulated SLO data",
      );
      return this.simulateMetric(slo);
    }

    try {
      const promql = this.buildPromQL(slo);
      const params = new URLSearchParams({
        query: promql,
        start: Math.floor(windowStart.getTime() / 1000).toString(),
        end: Math.floor(windowEnd.getTime() / 1000).toString(),
        step: this.getQueryStep(slo.window),
      });

      const url = `${this.prometheusUrl}/api/v1/query_range?${params.toString()}`;
      this.logger.debug(`Querying Prometheus: ${url}`);

      const response = await globalThis.fetch(url);

      if (!response.ok) {
        this.logger.error(
          `Prometheus query failed with status ${response.status}`,
        );
        return this.simulateMetric(slo);
      }

      const body = (await response.json()) as PrometheusQueryRangeResponse;

      if (
        body.status !== "success" ||
        !body.data?.result?.length ||
        !body.data.result[0].values?.length
      ) {
        this.logger.warn(
          "Prometheus returned no results; falling back to simulated data",
        );
        return this.simulateMetric(slo);
      }

      return this.extractPercentage(slo.metricType, body.data.result[0].values);
    } catch (error) {
      this.logger.error(
        `Failed to query Prometheus: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.simulateMetric(slo);
    }
  }

  /**
   * Builds a PromQL expression based on the SLO metric type.
   */
  private buildPromQL(slo: Slo): string {
    const componentFilter = slo.componentId
      ? `job="${slo.componentId}"`
      : 'job="default"';

    switch (slo.metricType) {
      case SloMetricType.AVAILABILITY:
        return `avg_over_time(up{${componentFilter}}[${slo.window}])`;
      case SloMetricType.LATENCY:
        return `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{${componentFilter}}[${slo.window}]))`;
      case SloMetricType.ERROR_RATE:
        return (
          `sum(rate(http_requests_total{status=~"5..",${componentFilter}}[${slo.window}]))` +
          ` / sum(rate(http_requests_total{${componentFilter}}[${slo.window}]))`
        );
    }
  }

  /**
   * Returns an appropriate query step duration for the given window.
   */
  private getQueryStep(window: SloWindow): string {
    switch (window) {
      case SloWindow.SEVEN_DAYS:
        return "1h";
      case SloWindow.THIRTY_DAYS:
        return "6h";
      case SloWindow.NINETY_DAYS:
        return "1d";
    }
  }

  /**
   * Extracts a percentage value from Prometheus time-series results.
   *
   * For availability: the average of values * 100 (Prometheus `up` is 0-1).
   * For latency: inverted to a compliance percentage (assumes 500 ms target).
   * For error_rate: converted to success rate (100 - error_rate * 100).
   */
  private extractPercentage(
    metricType: SloMetricType,
    values: [number, string][],
  ): number {
    const numericValues = values.map(([, v]) => parseFloat(v));
    const avg =
      numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;

    switch (metricType) {
      case SloMetricType.AVAILABILITY:
        // Prometheus `up` ranges from 0 to 1
        return avg * 100;
      case SloMetricType.LATENCY:
        // Lower latency is better; convert to a compliance percentage
        // using 0.5s as the 100% threshold
        return Math.min(100, Math.max(0, (1 - avg / 0.5) * 100));
      case SloMetricType.ERROR_RATE:
        // Convert error ratio to success percentage
        return (1 - avg) * 100;
    }
  }

  /**
   * Returns a simulated metric value for development and testing.
   * Produces a deterministic value based on the SLO name so that
   * results are stable across repeated calls.
   */
  private simulateMetric(slo: Slo): number {
    // Deterministic seed from the SLO name
    let hash = 0;
    for (let i = 0; i < slo.name.length; i++) {
      hash = (hash * 31 + slo.name.charCodeAt(i)) & 0x7fffffff;
    }

    const targetPercent = Number(slo.targetPercent);
    // Simulated value fluctuates slightly around the target
    const variance = ((hash % 100) - 50) / 1000; // -0.05 to +0.05
    return Math.min(100, Math.max(0, targetPercent + variance));
  }

  /**
   * Determines the budget status based on the remaining budget percentage.
   */
  private determineBudgetStatus(budgetRemaining: number): SloBudgetStatus {
    if (budgetRemaining <= 0) return SloBudgetStatus.EXHAUSTED;
    if (budgetRemaining <= 10) return SloBudgetStatus.CRITICAL;
    if (budgetRemaining <= 50) return SloBudgetStatus.WARNING;
    return SloBudgetStatus.HEALTHY;
  }
}

/**
 * Minimal type definition for the Prometheus query_range API response.
 */
interface PrometheusQueryRangeResponse {
  status: string;
  data?: {
    resultType?: string;
    result?: Array<{
      metric?: Record<string, string>;
      values?: [number, string][];
    }>;
  };
}
