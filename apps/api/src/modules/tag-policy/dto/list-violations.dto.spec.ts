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

    it("should pass through non-string boolean values unchanged", () => {
      const dto = plainToInstance(ListViolationsDto, {
        orgId: "org-uuid-1",
        resolved: true,
      });

      expect(dto.resolved).toBe(true);
    });
  });

  it("should apply default value of 0 when skip is omitted", () => {
    const dto = plainToInstance(ListViolationsDto, { orgId: "org-uuid-1" });

    expect(dto.skip).toBe(0);
  });

  it("should apply default value of 20 when take is omitted", () => {
    const dto = plainToInstance(ListViolationsDto, { orgId: "org-uuid-1" });

    expect(dto.take).toBe(20);
  });
});
