import { IsString, IsNotEmpty, IsUUID, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for creating a new operator-to-component binding.
 */
export class CreateOperatorBindingDto {
  @ApiProperty({ example: "prometheus-operator" })
  @IsString()
  @IsNotEmpty()
  operatorName: string;

  @ApiProperty({ example: "monitoring" })
  @IsString()
  @IsNotEmpty()
  operatorNamespace: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  @IsUUID()
  componentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
