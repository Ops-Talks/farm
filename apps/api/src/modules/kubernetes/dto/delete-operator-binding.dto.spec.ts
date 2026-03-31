import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { DeleteOperatorBindingDto } from "./delete-operator-binding.dto";

describe("DeleteOperatorBindingDto", () => {
  function toDto(
    partial: Partial<DeleteOperatorBindingDto>,
  ): DeleteOperatorBindingDto {
    return plainToInstance(DeleteOperatorBindingDto, partial);
  }

  it("should accept a valid payload", async () => {
    const dto = toDto({
      operatorNamespace: "monitoring",
      componentId: "550e8400-e29b-41d4-a716-446655440001",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should reject when operatorNamespace is missing", async () => {
    const dto = toDto({
      componentId: "550e8400-e29b-41d4-a716-446655440001",
    });

    const errors = await validate(dto);
    expect(
      errors.find((e) => e.property === "operatorNamespace"),
    ).toBeDefined();
  });

  it("should reject when componentId is not a UUID", async () => {
    const dto = toDto({
      operatorNamespace: "monitoring",
      componentId: "invalid",
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === "componentId")).toBeDefined();
  });

  it("should reject when componentId is missing", async () => {
    const dto = toDto({
      operatorNamespace: "monitoring",
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === "componentId")).toBeDefined();
  });

  it("should reject when operatorNamespace is empty", async () => {
    const dto = toDto({
      operatorNamespace: "",
      componentId: "550e8400-e29b-41d4-a716-446655440001",
    });

    const errors = await validate(dto);
    expect(
      errors.find((e) => e.property === "operatorNamespace"),
    ).toBeDefined();
  });
});
