import { getMetadataArgsStorage } from "typeorm";
import { ApiHealthCheck } from "../api-health-check.entity";
import { ApiSpec } from "../../../api-specs/entities/api-spec.entity";

describe("ApiHealthCheck entity", () => {
  it("should resolve the ManyToOne type function for the apiSpec relation", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === ApiHealthCheck && r.propertyName === "apiSpec",
    );
    expect(relation).toBeDefined();
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(ApiSpec);
    }
  });
});
