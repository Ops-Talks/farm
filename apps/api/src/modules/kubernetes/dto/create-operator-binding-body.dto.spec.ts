import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateOperatorBindingBodyDto } from "./create-operator-binding-body.dto";

describe("CreateOperatorBindingBodyDto", () => {
  function toDto(
    partial: Partial<CreateOperatorBindingBodyDto>,
  ): CreateOperatorBindingBodyDto {
    return plainToInstance(CreateOperatorBindingBodyDto, partial);
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
      componentId: "bad",
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
