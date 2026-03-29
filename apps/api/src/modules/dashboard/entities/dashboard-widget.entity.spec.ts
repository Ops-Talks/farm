import { getMetadataArgsStorage } from "typeorm";
import { DashboardWidget, WidgetType } from "./dashboard-widget.entity";
import { Dashboard } from "./dashboard.entity";

describe("DashboardWidget entity", () => {
  it("should define the dashboard_widgets table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === DashboardWidget);
    expect(table).toBeDefined();
    expect(table?.name).toBe("dashboard_widgets");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === DashboardWidget)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "dashboardId",
        "type",
        "title",
        "gridX",
        "gridY",
        "gridW",
        "gridH",
        "config",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should resolve ManyToOne type for dashboard relation", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === DashboardWidget && r.propertyName === "dashboard",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("many-to-one");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(Dashboard);
    }
  });

  it("should export WidgetType enum with all 8 values", () => {
    expect(Object.values(WidgetType)).toHaveLength(8);
    expect(WidgetType.METRIC_GRAPH).toBe("metric_graph");
    expect(WidgetType.COMPONENT_HEALTH).toBe("component_health");
    expect(WidgetType.DEPLOYMENT_FEED).toBe("deployment_feed");
    expect(WidgetType.QUEUE_STATUS).toBe("queue_status");
    expect(WidgetType.SLO_GAUGE).toBe("slo_gauge");
    expect(WidgetType.ALERT_SUMMARY).toBe("alert_summary");
    expect(WidgetType.TEAM_ACTIVITY).toBe("team_activity");
    expect(WidgetType.UPTIME_CHART).toBe("uptime_chart");
  });
});
