import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListSlosQueryDto } from "./list-slos-query.dto";
import { SloMetricType, SloWindow } from "../entities/slo.entity";

describe("ListSlosQueryDto", () => {
  it("should pass validation with no filters", async () => {
    const dto = plainToInstance(ListSlosQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should pass validation with all filters provided", async () => {
    const dto = plainToInstance(ListSlosQueryDto, {
      componentId: "550e8400-e29b-41d4-a716-446655440001",
      metricType: SloMetricType.AVAILABILITY,
      window: SloWindow.THIRTY_DAYS,
      organizationId: "550e8400-e29b-41d4-a716-446655440100",
      enabled: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation when componentId is not a UUID", async () => {
    const dto = plainToInstance(ListSlosQueryDto, {
      componentId: "not-a-uuid",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("componentId");
  });

  it("should fail validation with invalid metricType", async () => {
    const dto = plainToInstance(ListSlosQueryDto, {
      metricType: "invalid",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("metricType");
  });

  it("should fail validation with invalid window value", async () => {
    const dto = plainToInstance(ListSlosQueryDto, {
      window: "invalid",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("window");
  });

  it("should transform string 'true' to boolean true for enabled", () => {
    const dto = plainToInstance(ListSlosQueryDto, { enabled: "true" });
    expect(dto.enabled).toBe(true);
  });

  it("should transform string 'false' to boolean false for enabled", () => {
    const dto = plainToInstance(ListSlosQueryDto, { enabled: "false" });
    expect(dto.enabled).toBe(false);
  });

  it("should keep boolean true as-is for enabled", () => {
    const dto = plainToInstance(ListSlosQueryDto, { enabled: true });
    expect(dto.enabled).toBe(true);
  });

  it("should keep boolean false as-is for enabled", () => {
    const dto = plainToInstance(ListSlosQueryDto, { enabled: false });
    expect(dto.enabled).toBe(false);
  });

  it("should accept valid SLO windows", async () => {
    for (const window of [
      SloWindow.SEVEN_DAYS,
      SloWindow.THIRTY_DAYS,
      SloWindow.NINETY_DAYS,
    ]) {
      const dto = plainToInstance(ListSlosQueryDto, { window });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it("should accept valid metric types", async () => {
    for (const metricType of [
      SloMetricType.AVAILABILITY,
      SloMetricType.LATENCY,
      SloMetricType.ERROR_RATE,
    ]) {
      const dto = plainToInstance(ListSlosQueryDto, { metricType });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
