import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AdvancedSearchQueryDto } from "./advanced-search-query.dto";

describe("AdvancedSearchQueryDto", () => {
  it("should pass validation with valid minimal input", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, { q: "test" });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation when q is missing", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("q");
  });

  it("should fail validation when q is less than 2 characters", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, { q: "a" });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should transform a single string types value into an array", () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      types: "Component",
    });
    expect(dto.types).toEqual(["Component"]);
  });

  it("should keep types as an array when already an array", () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      types: ["Component", "Team"],
    });
    expect(dto.types).toEqual(["Component", "Team"]);
  });

  it("should transform a single string tags value into an array", () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      tags: "backend",
    });
    expect(dto.tags).toEqual(["backend"]);
  });

  it("should keep tags as an array when already an array", () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      tags: ["backend", "production"],
    });
    expect(dto.tags).toEqual(["backend", "production"]);
  });

  it("should transform page to number", () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      page: "3",
    });
    expect(dto.page).toBe(3);
  });

  it("should transform limit to number", () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      limit: "50",
    });
    expect(dto.limit).toBe(50);
  });

  it("should fail validation when limit exceeds 100", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      limit: 200,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should fail validation when page is less than 1", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      page: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should pass validation with all fields provided", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test query",
      types: ["Component"],
      namespace: "default",
      tags: ["production"],
      page: 1,
      limit: 20,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should accept namespace as a string", async () => {
    const dto = plainToInstance(AdvancedSearchQueryDto, {
      q: "test",
      namespace: "production",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.namespace).toBe("production");
  });
});
