import { ElasticsearchIndexModule } from "./elasticsearch-index.module";

/**
 * Minimal compilation test for ElasticsearchIndexModule.
 *
 * Importing the module triggers the @Module() decorator metadata so the
 * structural module file is exercised by Istanbul without requiring a
 * real database connection or full Nest application context.
 */
describe("ElasticsearchIndexModule", () => {
  it("should be defined", () => {
    expect(ElasticsearchIndexModule).toBeDefined();
  });
});
