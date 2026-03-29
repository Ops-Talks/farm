import { getMetadataArgsStorage } from "typeorm";
import { Slo, SloMetricType, SloWindow } from "./slo.entity";

describe("Slo entity", () => {
  it("should define the slos table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === Slo);
    expect(table).toBeDefined();
    expect(table?.name).toBe("slos");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === Slo)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "description",
        "targetPercent",
        "metricType",
        "window",
        "componentId",
        "organizationId",
        "enabled",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should have index on componentId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === Slo);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("componentId");
  });

  it("should have index on organizationId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === Slo);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("organizationId");
  });

  it("should export SloMetricType enum with expected values", () => {
    expect(SloMetricType.AVAILABILITY).toBe("availability");
    expect(SloMetricType.LATENCY).toBe("latency");
    expect(SloMetricType.ERROR_RATE).toBe("error_rate");
  });

  it("should export SloWindow enum with expected values", () => {
    expect(SloWindow.SEVEN_DAYS).toBe("7d");
    expect(SloWindow.THIRTY_DAYS).toBe("30d");
    expect(SloWindow.NINETY_DAYS).toBe("90d");
  });
});
