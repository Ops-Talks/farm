import { getMetadataArgsStorage } from "typeorm";
import { Dashboard, DashboardVisibility } from "./dashboard.entity";
import { DashboardWidget } from "./dashboard-widget.entity";

describe("Dashboard entity", () => {
  it("should define the dashboards table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === Dashboard);
    expect(table).toBeDefined();
    expect(table?.name).toBe("dashboards");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === Dashboard)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "description",
        "ownerId",
        "visibility",
        "organizationId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should resolve OneToMany type for widgets relation", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === Dashboard && r.propertyName === "widgets",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("one-to-many");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(DashboardWidget);
    }
  });

  it("should export DashboardVisibility enum with expected values", () => {
    expect(DashboardVisibility.PRIVATE).toBe("private");
    expect(DashboardVisibility.WORKSPACE).toBe("workspace");
  });
});
