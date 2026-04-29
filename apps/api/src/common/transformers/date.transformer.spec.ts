import { dateTransformer } from "./date.transformer";

describe("dateTransformer", () => {
  describe("to()", () => {
    it("passes through a Date value unchanged", () => {
      const d = new Date("2024-01-15T12:00:00Z");
      expect(dateTransformer.to(d)).toBe(d);
    });

    it("passes through a string value unchanged", () => {
      const s = "2024-01-15T12:00:00Z";
      expect(dateTransformer.to(s)).toBe(s);
    });

    it("passes through null unchanged", () => {
      expect(dateTransformer.to(null)).toBeNull();
    });

    it("passes through undefined unchanged", () => {
      expect(dateTransformer.to(undefined)).toBeUndefined();
    });
  });

  describe("from()", () => {
    it("returns null for null", () => {
      expect(dateTransformer.from(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(dateTransformer.from(undefined)).toBeNull();
    });

    it("returns a Date instance as-is when the value is already a Date", () => {
      const d = new Date("2024-01-15T12:00:00Z");
      const result = dateTransformer.from(d) as Date | null;
      expect(result).toBe(d);
    });

    it("converts an ISO string to a Date instance", () => {
      const iso = "2024-06-01T08:30:00.000Z";
      const result = dateTransformer.from(iso) as Date | null;
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(new Date(iso).getTime());
    });
  });
});
