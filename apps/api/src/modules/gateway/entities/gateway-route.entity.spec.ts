import { getMetadataArgsStorage } from "typeorm";
import { GatewayRoute } from "./gateway-route.entity";
import { Component } from "../../catalog/entities/component.entity";

describe("GatewayRoute entity", () => {
  it("should resolve the ManyToOne type function for the component relation", () => {
    const storage = getMetadataArgsStorage();
    const relation = storage.relations.find(
      (r) => r.target === GatewayRoute && r.propertyName === "component",
    );
    expect(relation).toBeDefined();
    if (relation && typeof relation.type === "function") {
      const resolved = (relation.type as () => unknown)();
      expect(resolved).toBe(Component);
    }
  });
});
