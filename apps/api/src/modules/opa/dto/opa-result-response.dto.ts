import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OpaResult } from "../entities/opa-result.entity";

/**
 * Response DTO returned when querying stored OPA evaluation results.
 * Maps directly from the OpaResult entity.
 */
export class OpaResultResponseDto {
  @ApiProperty({
    example: "c58f9c80-...",
    description: "Unique evaluation result ID",
  })
  id: string;

  @ApiProperty({
    example: "550e8400-...",
    description: "ID of the evaluated component",
  })
  componentId: string;

  @ApiProperty({
    example: "policies/rbac.rego",
    description: "Path to the evaluated policy file",
  })
  policyPath: string;

  @ApiProperty({
    example: true,
    description: "Whether the evaluation passed (allowed=true)",
  })
  allowed: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: "Policy violations returned by OPA evaluation",
  })
  violations: string[];

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Timestamp when the evaluation was performed",
  })
  evaluatedAt: Date;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Record creation timestamp",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Record last update timestamp",
  })
  updatedAt: Date;

  /**
   * Constructs a response DTO from an OpaResult entity.
   *
   * @param entity - OpaResult entity to map
   * @returns Populated OpaResultResponseDto
   */
  static fromEntity(entity: OpaResult): OpaResultResponseDto {
    const dto = new OpaResultResponseDto();
    dto.id = entity.id;
    dto.componentId = entity.componentId;
    dto.policyPath = entity.policyPath;
    dto.allowed = entity.allowed;
    dto.violations = entity.violations ?? [];
    dto.evaluatedAt = entity.evaluatedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
