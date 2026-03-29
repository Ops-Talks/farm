import { getMetadataArgsStorage } from "typeorm";
import { PostMortem } from "./post-mortem.entity";
import { Incident } from "./incident.entity";

describe("PostMortem entity", () => {
  it("should define the post_mortems table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === PostMortem);
    expect(table).toBeDefined();
    expect(table?.name).toBe("post_mortems");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === PostMortem)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "incidentId",
        "rootCause",
        "contributingFactors",
        "actionItems",
        "body",
        "approvedBy",
        "approvedAt",
        "organizationId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should resolve OneToOne type for incident relation", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === PostMortem && r.propertyName === "incident",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("one-to-one");
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(Incident);
    }
  });
});
