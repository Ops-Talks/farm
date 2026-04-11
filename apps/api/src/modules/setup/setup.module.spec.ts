import { SetupModule } from "./setup.module";

/**
 * Minimal spec for SetupModule.
 * Instantiating the class directly exercises the decorator-annotated class
 * definition, bringing statement and line coverage to 100%.
 */
describe("SetupModule", () => {
  it("should be instantiable", () => {
    expect(new SetupModule()).toBeDefined();
  });
});
