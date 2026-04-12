import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OpaResult } from "../entities/opa-result.entity";

/**
 * Response DTO returned when querying stored OPA evaluation results.
 * Maps directly from the OpaResult entity.
 */
export class OpaResultResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  componentId: string;

  @ApiProperty()
  policyPath: string;

  @ApiProperty()
  allowed: boolean;

  @ApiPropertyOptional({ type: [String] })
  violations: string[];

  @ApiProperty()
  evaluatedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
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
