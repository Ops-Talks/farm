import { plainToInstance } from "class-transformer";
import { ListViolationsDto } from "./list-violations.dto";

/**
 * Unit tests for ListViolationsDto transform branches.
 * Covers the @Transform callbacks on `resolved`, `skip`, and `take` fields.
 */
describe("ListViolationsDto", () => {
  describe("resolved @Transform", () => {
    it("should convert the string 'true' to boolean true", () => {
      const dto = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        resolved: "true",
      });

      expect(dto.resolved).toBe(true);
    });

    it("should convert the string 'false' to boolean false", () => {
      const dto = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        resolved: "false",
      });

      expect(dto.resolved).toBe(false);
    });

    it("should pass through non-string boolean values unchanged", () => {
      const dto = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        resolved: true,
      });

      expect(dto.resolved).toBe(true);
    });

    it("should pass through numeric values unchanged via the fallback branch", () => {
      // Covers the final `return value` branch (value is neither 'true' nor 'false')
      const raw = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        resolved: 1,
      }) as unknown as { orgId: string; resolved: unknown };

      expect(raw.resolved).toBe(1);
    });
  });

  describe("skip @Transform", () => {
    it("should convert a numeric string to a number", () => {
      const dto = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        skip: "10",
      });

      expect(dto.skip).toBe(10);
    });

    it("should apply default value of 0 when skip is omitted", () => {
      const dto = plainToInstance(ListViolationsDto, { orgId: "org-uuid-1" });

      expect(dto.skip).toBe(0);
    });
  });

  describe("take @Transform", () => {
    it("should convert a numeric string to a number", () => {
      const dto = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        take: "50",
      });

      expect(dto.take).toBe(50);
    });

    it("should apply default value of 20 when take is omitted", () => {
      const dto = plainToInstance(ListViolationsDto, { orgId: "org-uuid-1" });

      expect(dto.take).toBe(20);
    });
  });
});
