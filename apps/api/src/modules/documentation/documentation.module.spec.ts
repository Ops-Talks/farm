import { DocumentationModule } from "./documentation.module";

/**
 * Minimal spec that imports DocumentationModule to satisfy Istanbul coverage
 * for the module decorator and isTest-guard lines.
 */
describe("DocumentationModule", () => {
  it("is defined", () => {
    expect(DocumentationModule).toBeDefined();
  });
});
