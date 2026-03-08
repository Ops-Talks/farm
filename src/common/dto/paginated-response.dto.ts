import { ApiProperty } from "@nestjs/swagger";

/**
 * Generic wrapper for paginated API responses.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "Array of items" })
  data: T[];

  @ApiProperty({ description: "Total number of items", example: 100 })
  total: number;

  @ApiProperty({ description: "Number of items skipped", example: 0 })
  skip: number;

  @ApiProperty({ description: "Number of items per page", example: 20 })
  take: number;

  constructor(data: T[], total: number, skip: number, take: number) {
    this.data = data;
    this.total = total;
    this.skip = skip;
    this.take = take;
  }
}
