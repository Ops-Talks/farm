import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface DashboardResponse {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  visibility: string;
  organizationId: string;
  widgets: WidgetResponse[];
}

interface WidgetResponse {
  id: string;
  dashboardId: string;
  type: string;
  title: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  config: Record<string, unknown> | null;
}

interface WidgetDataResponse {
  type: string;
  data: unknown;
  updatedAt: string;
}

describe("Dashboards Lifecycle (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full dashboard lifecycle: create -> list -> get -> update -> add widget -> update layout -> get widget data -> delete widget -> delete dashboard", async () => {
    // Step 1: Create a dashboard
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/dashboards")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "E2E Test Dashboard",
        description: "Dashboard for E2E testing",
        visibility: "private",
      })
      .expect(201);

    const created = createRes.body as DashboardResponse;
    expect(created.id).toBeDefined();
    expect(created.name).toBe("E2E Test Dashboard");
    expect(created.description).toBe("Dashboard for E2E testing");
    expect(created.visibility).toBe("private");
    expect(created.organizationId).toBe(organizationId);
    expect(created.widgets).toEqual([]);

    const dashboardId = created.id;

    // Step 2: List dashboards
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/dashboards")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const listBody = listRes.body as {
      data: DashboardResponse[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.some((d) => d.id === dashboardId)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(listBody.skip).toBe(0);
    expect(listBody.take).toBe(20);

    // Step 3: Get dashboard by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/dashboards/${dashboardId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const fetched = getRes.body as DashboardResponse;
    expect(fetched.id).toBe(dashboardId);
    expect(fetched.name).toBe("E2E Test Dashboard");

    // Step 4: Update the dashboard
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/dashboards/${dashboardId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ name: "Updated E2E Dashboard", visibility: "workspace" })
      .expect(200);

    const updated = updateRes.body as DashboardResponse;
    expect(updated.name).toBe("Updated E2E Dashboard");
    expect(updated.visibility).toBe("workspace");

    // Step 5: Add a widget to the dashboard
    const widgetRes = await request(app.getHttpServer())
      .post(`/api/v1/dashboards/${dashboardId}/widgets`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        type: "metric_graph",
        title: "CPU Usage",
        gridX: 0,
        gridY: 0,
        gridW: 6,
        gridH: 4,
        config: { metricName: "cpu_usage_percent" },
      })
      .expect(201);

    const widget = widgetRes.body as WidgetResponse;
    expect(widget.id).toBeDefined();
    expect(widget.dashboardId).toBe(dashboardId);
    expect(widget.type).toBe("metric_graph");
    expect(widget.title).toBe("CPU Usage");
    expect(widget.gridX).toBe(0);
    expect(widget.gridY).toBe(0);
    expect(widget.gridW).toBe(6);
    expect(widget.gridH).toBe(4);

    const widgetId = widget.id;

    // Step 6: Update the layout (reposition widget)
    const layoutRes = await request(app.getHttpServer())
      .patch(`/api/v1/dashboards/${dashboardId}/layout`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        widgets: [{ widgetId, x: 3, y: 2, w: 8, h: 5 }],
      })
      .expect(200);

    const layoutDashboard = layoutRes.body as DashboardResponse;
    const repositionedWidget = layoutDashboard.widgets.find(
      (w) => w.id === widgetId,
    );
    expect(repositionedWidget).toBeDefined();
    expect(repositionedWidget!.gridX).toBe(3);
    expect(repositionedWidget!.gridY).toBe(2);
    expect(repositionedWidget!.gridW).toBe(8);
    expect(repositionedWidget!.gridH).toBe(5);

    // Step 7: Get widget data
    const dataRes = await request(app.getHttpServer())
      .get(`/api/v1/dashboards/${dashboardId}/widgets/${widgetId}/data`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(200);

    const widgetData = dataRes.body as WidgetDataResponse;
    expect(widgetData.type).toBe("metric_graph");
    expect(widgetData.data).toBeDefined();
    expect(widgetData.updatedAt).toBeDefined();

    // Step 8: Update the widget
    const updateWidgetRes = await request(app.getHttpServer())
      .patch(`/api/v1/dashboards/${dashboardId}/widgets/${widgetId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({ title: "Updated CPU Usage" })
      .expect(200);

    expect((updateWidgetRes.body as WidgetResponse).title).toBe(
      "Updated CPU Usage",
    );

    // Step 9: Delete the widget
    await request(app.getHttpServer())
      .delete(`/api/v1/dashboards/${dashboardId}/widgets/${widgetId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Step 10: Delete the dashboard
    await request(app.getHttpServer())
      .delete(`/api/v1/dashboards/${dashboardId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(204);

    // Verify dashboard no longer exists
    await request(app.getHttpServer())
      .get(`/api/v1/dashboards/${dashboardId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .expect(404);
  });

  it("should reject creation without auth (401)", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/dashboards")
      .send({
        name: "Unauthorized Dashboard",
      })
      .expect(401);
  });

  it("should reject widget with invalid type (400)", async () => {
    // First create a dashboard to attach the widget to
    const createRes = await request(app.getHttpServer())
      .post("/api/v1/dashboards")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        name: "Dashboard for Invalid Widget Test",
      })
      .expect(201);

    const dashboardId = (createRes.body as DashboardResponse).id;

    // Attempt to create a widget with an invalid type
    await request(app.getHttpServer())
      .post(`/api/v1/dashboards/${dashboardId}/widgets`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Organization-Id", organizationId)
      .send({
        type: "totally_invalid_widget_type",
        title: "Bad Widget",
      })
      .expect(400);
  });
});
