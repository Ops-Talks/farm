import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateOperatorBindingDto } from "./create-operator-binding.dto";

describe("CreateOperatorBindingDto", () => {
  function toDto(
    partial: Partial<CreateOperatorBindingDto>,
  ): CreateOperatorBindingDto {
    return plainToInstance(CreateOperatorBindingDto, partial);
  }

  it("should accept a valid payload with all fields", async () => {
    const dto = toDto({
      operatorName: "prometheus-operator",
      operatorNamespace: "monitoring",
      componentId: "550e8400-e29b-41d4-a716-446655440001",
      organizationId: "org-1",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should accept a payload without optional fields", async () => {
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
    const nsError = errors.find((e) => e.property === "operatorNamespace");
    expect(nsError).toBeDefined();
  });

  it("should reject when componentId is not a UUID", async () => {
    const dto = toDto({
      operatorNamespace: "monitoring",
      componentId: "not-a-uuid",
    });

    const errors = await validate(dto);
    const idError = errors.find((e) => e.property === "componentId");
    expect(idError).toBeDefined();
  });

  it("should reject when operatorNamespace is empty string", async () => {
    const dto = toDto({
      operatorNamespace: "",
      componentId: "550e8400-e29b-41d4-a716-446655440001",
    });

    const errors = await validate(dto);
    const nsError = errors.find((e) => e.property === "operatorNamespace");
    expect(nsError).toBeDefined();
  });

  it("should reject when operatorName is empty string", async () => {
    const dto = toDto({
      operatorName: "",
      operatorNamespace: "monitoring",
      componentId: "550e8400-e29b-41d4-a716-446655440001",
    });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === "operatorName");
    expect(nameError).toBeDefined();
  });

  it("should reject when componentId is missing", async () => {
    const dto = toDto({
      operatorNamespace: "monitoring",
      componentId: undefined,
    });

    const errors = await validate(dto);
    const idError = errors.find((e) => e.property === "componentId");
    expect(idError).toBeDefined();
  });
});
