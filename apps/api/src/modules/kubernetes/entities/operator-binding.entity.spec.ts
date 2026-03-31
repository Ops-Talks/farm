import { getMetadataArgsStorage } from "typeorm";
import { OperatorBinding } from "./operator-binding.entity";

describe("OperatorBinding entity", () => {
  it("should create an instance", () => {
    const entity = new OperatorBinding();
    expect(entity).toBeDefined();
  });

  it("should define the operator_bindings table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === OperatorBinding);
    expect(table).toBeDefined();
    expect(table?.name).toBe("operator_bindings");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === OperatorBinding)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "operatorName",
        "operatorNamespace",
        "componentId",
        "addedAt",
        "organizationId",
      ]),
    );
  });

  it("should have index on componentId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === OperatorBinding);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("componentId");
  });

  it("should have index on organizationId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === OperatorBinding);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("organizationId");
  });

  it("should define a unique constraint on operatorName + operatorNamespace + componentId", () => {
    const storage = getMetadataArgsStorage();
    const uniques = storage.uniques.filter((u) => u.target === OperatorBinding);
    expect(uniques).toHaveLength(1);
    expect(uniques[0].name).toBe("UQ_operator_binding");
    expect(uniques[0].columns).toEqual(
      expect.arrayContaining([
        "operatorName",
        "operatorNamespace",
        "componentId",
      ]),
    );
  });

  it("should define a ManyToOne relation to Component", () => {
    const storage = getMetadataArgsStorage();
    const relations = storage.relations.filter(
      (r) => r.target === OperatorBinding,
    );
    const componentRelation = relations.find(
      (r) => r.propertyName === "component",
    );
    expect(componentRelation).toBeDefined();
    expect(componentRelation?.relationType).toBe("many-to-one");
  });

  it("should allow setting all properties", () => {
    const entity = new OperatorBinding();
    const now = new Date();

    entity.id = "uuid-1";
    entity.operatorName = "prometheus-operator";
    entity.operatorNamespace = "monitoring";
    entity.componentId = "comp-uuid-1";
    entity.addedAt = now;
    entity.organizationId = "org-uuid-1";

    expect(entity.id).toBe("uuid-1");
    expect(entity.operatorName).toBe("prometheus-operator");
    expect(entity.operatorNamespace).toBe("monitoring");
    expect(entity.componentId).toBe("comp-uuid-1");
    expect(entity.addedAt).toBe(now);
    expect(entity.organizationId).toBe("org-uuid-1");
  });
});
