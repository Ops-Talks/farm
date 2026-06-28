import { plainToInstance } from "class-transformer";
import { ListAlertingRulesQueryDto } from "./list-alerting-rules-query.dto";

/**
 * Unit tests for ListAlertingRulesQueryDto transform branches.
 * Covers the @Transform callback on the `enabled` boolean field.
 */
describe("ListAlertingRulesQueryDto", () => {
  describe("enabled @Transform", () => {
    it("should convert the string 'true' to boolean true", () => {
      const dto = plainToInstance(ListAlertingRulesQueryDto, {
        enabled: "true",
      });

      expect(dto.enabled).toBe(true);
    });

    it("should pass through non-string values via the fallback branch", () => {
      const raw = plainToInstance(ListAlertingRulesQueryDto, {
        enabled: 0,
      }) as unknown as { enabled: unknown };

      expect(raw.enabled).toBe(false);
    });

    it("should leave enabled undefined when not provided", () => {
      const dto = plainToInstance(ListAlertingRulesQueryDto, {});

      expect(dto.enabled).toBeUndefined();
    });
  });
});
