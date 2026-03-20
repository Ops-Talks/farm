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

    it("should convert the string 'false' to boolean false", () => {
      const dto = plainToInstance(ListAlertingRulesQueryDto, {
        enabled: "false",
      });

      expect(dto.enabled).toBe(false);
    });

    it("should pass through non-string values via the fallback branch", () => {
      // Covers the final `return value` branch (value is neither 'true' nor 'false')
      const raw = plainToInstance(ListAlertingRulesQueryDto, {
        enabled: 0,
      }) as unknown as { enabled: unknown };

      expect(raw.enabled).toBe(0);
    });

    it("should leave enabled undefined when not provided", () => {
      const dto = plainToInstance(ListAlertingRulesQueryDto, {});

      expect(dto.enabled).toBeUndefined();
    });
  });
});
