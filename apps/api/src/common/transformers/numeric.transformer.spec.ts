import { numericTransformer } from "./numeric.transformer";

describe("numericTransformer", () => {
  describe("to()", () => {
    it("passes through numeric values unchanged", () => {
      expect(numericTransformer.to(42)).toBe(42);
      expect(numericTransformer.to(0)).toBe(0);
      expect(numericTransformer.to(-3.14)).toBe(-3.14);
    });

    it("passes through null and undefined", () => {
      expect(numericTransformer.to(null)).toBeNull();
      expect(numericTransformer.to(undefined)).toBeUndefined();
    });
  });

  describe("from()", () => {
    it("parses numeric strings to numbers", () => {
      expect(numericTransformer.from("12.5000")).toBe(12.5);
      expect(numericTransformer.from("0")).toBe(0);
      expect(numericTransformer.from("-3.14")).toBe(-3.14);
    });

    it("returns null for null or undefined", () => {
      expect(numericTransformer.from(null)).toBeNull();
      expect(numericTransformer.from(undefined)).toBeNull();
    });

    it("returns null for non-numeric strings", () => {
      expect(numericTransformer.from("not-a-number")).toBeNull();
    });
  });
});
