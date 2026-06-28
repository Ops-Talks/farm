import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * A single weighted destination entry inside a VirtualService route patch
 * request.
 */
class WeightEntryDto {
  /** Kubernetes service host name (destination). */
  @ApiProperty({ example: "reviews", description: "Destination service name" })
  @IsString()
  @IsNotEmpty()
  destination: string;

  /** Traffic weight assigned to this destination (0-100). */
  @ApiProperty({
    example: 80,
    description: "Traffic weight percentage (0-100)",
  })
  @IsInt()
  @Min(0)
  @Max(100)
  weight: number;
}

/**
 * Request body for the PATCH /istio/virtual-services/:namespace/:name/weights
 * endpoint. Provides an ordered list of destination/weight pairs that replace
 * the route weights in the first HTTP route rule of the target VirtualService.
 *
 * The sum of all weights should equal 100; the Istio control plane normalizes
 * non-summing values, but consumers should send valid splits.
 */
export class PatchWeightsDto {
  /** Ordered list of destination/weight pairs. */
  @ApiProperty({
    type: [WeightEntryDto],
    description: "Array of destination-to-weight mappings",
    example: [{ destination: "reviews", weight: 80 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightEntryDto)
  weights: WeightEntryDto[];
}
