import { SearchModule } from "./search.module";

/**
 * Minimal spec for SearchModule.
 * Instantiating the class directly exercises the decorator-annotated class
 * definition, bringing statement and line coverage to 100%.
 */
describe("SearchModule", () => {
  it("should be instantiable", () => {
    expect(new SearchModule()).toBeDefined();
  });
});
