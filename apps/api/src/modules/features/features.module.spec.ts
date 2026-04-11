import { FeaturesModule } from "./features.module";

/**
 * Minimal spec for FeaturesModule.
 * Instantiating the class directly exercises the decorator-annotated class
 * definition, bringing statement and line coverage to 100%.
 */
describe("FeaturesModule", () => {
  it("should be instantiable", () => {
    expect(new FeaturesModule()).toBeDefined();
  });
});
