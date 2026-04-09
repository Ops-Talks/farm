import { IsString, IsNotEmpty, IsIn, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a new Flux-resource-to-component binding.
 */
export class CreateFluxBindingDto {
  @ApiProperty({
    enum: ["Kustomization", "HelmRelease"],
    description: "Flux resource kind",
  })
  @IsIn(["Kustomization", "HelmRelease"])
  resourceKind: "Kustomization" | "HelmRelease";

  @ApiProperty({
    example: "my-app",
    description: "Flux resource name",
  })
  @IsString()
  @IsNotEmpty()
  resourceName: string;

  @ApiProperty({
    example: "flux-system",
    description: "Kubernetes namespace of the Flux resource",
  })
  @IsString()
  @IsNotEmpty()
  resourceNamespace: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Catalog component UUID to bind to",
  })
  @IsString()
  @IsNotEmpty()
  componentId: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Organization UUID that owns this binding",
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
