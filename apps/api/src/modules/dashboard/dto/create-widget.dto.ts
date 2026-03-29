import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsObject,
  Min,
  Max,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WidgetType } from "../entities/dashboard-widget.entity";

/**
 * DTO for creating a new widget on a dashboard.
 */
export class CreateWidgetDto {
  @ApiProperty({
    enum: WidgetType,
    example: WidgetType.METRIC_GRAPH,
    description: "Type of widget to render",
  })
  @IsEnum(WidgetType)
  type: WidgetType;

  @ApiProperty({
    example: "Request Latency P99",
    description: "Display title for the widget",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  title: string;

  @ApiPropertyOptional({
    example: 0,
    description: "Horizontal grid position (column)",
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  gridX?: number = 0;

  @ApiPropertyOptional({
    example: 0,
    description: "Vertical grid position (row)",
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  gridY?: number = 0;

  @ApiPropertyOptional({
    example: 4,
    description: "Widget width in grid units",
    default: 4,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  gridW?: number = 4;

  @ApiPropertyOptional({
    example: 3,
    description: "Widget height in grid units",
    default: 3,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  gridH?: number = 3;

  @ApiPropertyOptional({
    example: { metricName: "http_request_duration_seconds", range: "1h" },
    description: "Widget-specific configuration object",
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}
