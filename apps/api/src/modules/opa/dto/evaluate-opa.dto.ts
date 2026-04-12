import { IsObject, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Request body DTO for evaluating an OPA policy.
 */
export class EvaluateOpaDto {
  /** OPA policy path to evaluate, e.g. "app/rbac/allow" */
  @ApiProperty({ description: "OPA policy path to evaluate" })
  @IsString()
  policyPath: string;

  /** Arbitrary input document passed to the policy */
  @ApiProperty({ description: "Input document for the policy evaluation" })
  @IsObject()
  input: Record<string, unknown>;

  /**
   * Optional catalog component ID.
   * When provided, the evaluation result is persisted to the database.
   */
  @ApiPropertyOptional({
    description: "Catalog component UUID; result is saved when provided",
  })
  @IsString()
  @IsOptional()
  componentId?: string;
}
