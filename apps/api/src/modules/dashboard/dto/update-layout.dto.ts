import { ApiProperty } from "@nestjs/swagger";
import {
  IsUUID,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Position and size of a single widget within the dashboard grid.
 */
class WidgetPositionDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID of the widget to reposition",
  })
  @IsUUID()
  widgetId: string;

  @ApiProperty({
    example: 0,
    description: "Horizontal grid position (column)",
  })
  @IsInt()
  @Min(0)
  x: number;

  @ApiProperty({
    example: 0,
    description: "Vertical grid position (row)",
  })
  @IsInt()
  @Min(0)
  y: number;

  @ApiProperty({
    example: 4,
    description: "Widget width in grid units",
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  w: number;

  @ApiProperty({
    example: 3,
    description: "Widget height in grid units",
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  h: number;
}

/**
 * DTO for bulk-updating widget positions and sizes on a dashboard.
 */
export class UpdateLayoutDto {
  @ApiProperty({
    type: [WidgetPositionDto],
    description: "Array of widget positions to update",
  })
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionDto)
  @IsArray()
  widgets: WidgetPositionDto[];
}
