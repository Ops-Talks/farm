import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Data transfer object for creating a KEDA ScaledObject-to-component binding.
 */
export class CreateKedaBindingDto {
  @ApiProperty({
    example: "my-app-scaler",
    description: "KEDA ScaledObject name",
  })
  @IsString()
  @IsNotEmpty()
  scaledObjectName: string;

  @ApiProperty({
    example: "production",
    description: "Kubernetes namespace of the ScaledObject",
  })
  @IsString()
  @IsNotEmpty()
  scaledObjectNamespace: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Catalog component UUID to link to this ScaledObject",
  })
  @IsString()
  @IsNotEmpty()
  componentId: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Organization UUID to scope the binding",
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
