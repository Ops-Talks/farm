import { getMetadataArgsStorage } from "typeorm";
import { Incident, IncidentSeverity, IncidentStatus } from "./incident.entity";
import { Component } from "../../catalog/entities/component.entity";
import { Environment } from "../../environments/entities/environment.entity";
import { IncidentUpdate } from "./incident-update.entity";

describe("Incident entity", () => {
  it("should define the incidents table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === Incident);
    expect(table).toBeDefined();
    expect(table?.name).toBe("incidents");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === Incident)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "title",
        "description",
        "severity",
        "status",
        "commanderUserId",
        "organizationId",
        "resolvedAt",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should resolve ManyToMany type for affectedComponents", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === Incident && r.propertyName === "affectedComponents",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("many-to-many");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(Component);
    }
  });

  it("should resolve ManyToMany type for affectedEnvironments", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === Incident && r.propertyName === "affectedEnvironments",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("many-to-many");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(Environment);
    }
  });

  it("should resolve OneToMany type for updates", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === Incident && r.propertyName === "updates",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("one-to-many");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(IncidentUpdate);
    }
  });

  it("should export IncidentSeverity enum with expected values", () => {
    expect(IncidentSeverity.P1).toBe("P1");
    expect(IncidentSeverity.P2).toBe("P2");
    expect(IncidentSeverity.P3).toBe("P3");
    expect(IncidentSeverity.P4).toBe("P4");
  });

  it("should export IncidentStatus enum with expected values", () => {
    expect(IncidentStatus.OPEN).toBe("open");
    expect(IncidentStatus.INVESTIGATING).toBe("investigating");
    expect(IncidentStatus.IDENTIFIED).toBe("identified");
    expect(IncidentStatus.RESOLVED).toBe("resolved");
  });

  it("should resolve ApiProperty type callback for affectedComponents", () => {
    const metadata = Reflect.getMetadata(
      "swagger/apiModelProperties",
      Incident.prototype,
      "affectedComponents",
    ) as { type?: () => unknown } | undefined;
    expect(metadata).toBeDefined();
    expect(typeof metadata!.type).toBe("function");
    const resolved = metadata!.type!();
    expect(resolved).toEqual([Component]);
  });

  it("should resolve ApiProperty type callback for affectedEnvironments", () => {
    const metadata = Reflect.getMetadata(
      "swagger/apiModelProperties",
      Incident.prototype,
      "affectedEnvironments",
    ) as { type?: () => unknown } | undefined;
    expect(metadata).toBeDefined();
    expect(typeof metadata!.type).toBe("function");
    const resolved = metadata!.type!();
    expect(resolved).toEqual([Environment]);
  });

  it("should resolve ApiProperty type callback for updates", () => {
    const metadata = Reflect.getMetadata(
      "swagger/apiModelProperties",
      Incident.prototype,
      "updates",
    ) as { type?: () => unknown } | undefined;
    expect(metadata).toBeDefined();
    expect(typeof metadata!.type).toBe("function");
    const resolved = metadata!.type!();
    expect(resolved).toEqual([IncidentUpdate]);
  });
});
