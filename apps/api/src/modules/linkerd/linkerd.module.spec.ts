import { LinkerdModule } from "./linkerd.module";

/**
 * Minimal spec that imports LinkerdModule to satisfy Istanbul coverage for the
 * module decorator and isTest-guard lines (pattern from finops.module.spec.ts).
 */
describe("LinkerdModule", () => {
  it("is defined", () => {
    expect(LinkerdModule).toBeDefined();
  });
});
