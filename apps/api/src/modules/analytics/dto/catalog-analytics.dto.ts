import { ApiProperty } from "@nestjs/swagger";

/**
 * Ownership coverage summary for all catalog components.
 */
export class OwnershipCoverageDto {
  @ApiProperty({ example: 42, description: "Total number of components" })
  total: number;

  @ApiProperty({
    example: 35,
    description: "Number of components that have an owner assigned",
  })
  withOwner: number;

  @ApiProperty({
    example: 7,
    description: "Number of components that have no owner assigned",
  })
  withoutOwner: number;

  @ApiProperty({
    example: 83.3,
    description:
      "Percentage of components with an owner (rounded to 1 decimal)",
  })
  coveragePercent: number;
}

/**
 * Component count grouped by lifecycle stage.
 */
export class LifecycleCountDto {
  @ApiProperty({
    example: "production",
    description: "The lifecycle stage name",
  })
  lifecycle: string;

  @ApiProperty({
    example: 12,
    description: "Number of components in this lifecycle stage",
  })
  count: number;
}

/**
 * Component count grouped by kind.
 */
export class KindCountDto {
  @ApiProperty({ example: "service", description: "The component kind name" })
  kind: string;

  @ApiProperty({
    example: 8,
    description: "Number of components of this kind",
  })
  count: number;
}

/**
 * A component that has no owner assigned.
 */
export class UnownedComponentDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Component unique identifier",
  })
  id: string;

  @ApiProperty({ example: "payment-service", description: "Component name" })
  name: string;

  @ApiProperty({ example: "service", description: "Component kind" })
  kind: string;
}

/**
 * Aggregated catalog health analytics response.
 */
export class CatalogAnalyticsDto {
  @ApiProperty({
    type: OwnershipCoverageDto,
    description: "Ownership coverage summary across all components",
  })
  ownershipCoverage: OwnershipCoverageDto;

  @ApiProperty({
    type: [LifecycleCountDto],
    description: "Distribution of components by lifecycle stage",
  })
  lifecycleDistribution: LifecycleCountDto[];

  @ApiProperty({
    type: [KindCountDto],
    description:
      "Distribution of components by kind (only kinds with at least one component)",
  })
  kindDistribution: KindCountDto[];

  @ApiProperty({
    type: [UnownedComponentDto],
    description: "Components without an assigned owner (limited to 50)",
  })
  unownedComponents: UnownedComponentDto[];
}
