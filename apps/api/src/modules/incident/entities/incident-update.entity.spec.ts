import { getMetadataArgsStorage } from "typeorm";
import { IncidentUpdate } from "./incident-update.entity";
import { Incident } from "./incident.entity";

describe("IncidentUpdate entity", () => {
  it("should define the incident_updates table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === IncidentUpdate);
    expect(table).toBeDefined();
    expect(table?.name).toBe("incident_updates");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === IncidentUpdate)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "incidentId",
        "authorId",
        "message",
        "previousStatus",
        "newStatus",
        "createdAt",
      ]),
    );
  });

  it("should resolve ManyToOne type for incident relation", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === IncidentUpdate && r.propertyName === "incident",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("many-to-one");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(Incident);
    }
  });
});
