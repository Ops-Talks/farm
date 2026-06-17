import { Logger } from "@nestjs/common";
import { IsString, IsOptional, IsNumber } from "class-validator";
import { validateResponse } from "./validate-response";

class TestDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  value?: number;
}

describe("validateResponse", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger("TestLogger");
    jest.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes validation for a valid response", () => {
    const data = { name: "test", value: 42 };

    const result = validateResponse(TestDto, data, "TestOp", logger);

    expect(result).toBeInstanceOf(TestDto);
    expect(result.name).toBe("test");
    expect(result.value).toBe(42);
  });

  it("passes validation for a valid response with optional field missing", () => {
    const data = { name: "test" };

    const result = validateResponse(TestDto, data, "TestOp", logger);

    expect(result).toBeInstanceOf(TestDto);
    expect(result.name).toBe("test");
    expect(result.value).toBeUndefined();
  });

  it("throws BadGatewayException when a required field is missing", () => {
    const data = { value: 42 };

    expect(() => validateResponse(TestDto, data, "TestOp", logger)).toThrow(
      "TestOp: invalid response from upstream service",
    );
  });

  it("throws BadGatewayException on type mismatch", () => {
    const data = { name: 123 };

    expect(() => validateResponse(TestDto, data, "TestOp", logger)).toThrow(
      "TestOp: invalid response from upstream service",
    );
  });

  it("logs validation errors on failure", () => {
    const data = { name: 123 };

    expect(() => validateResponse(TestDto, data, "TestOp", logger)).toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("TestOp: response validation failed"),
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("name"));
  });
});
