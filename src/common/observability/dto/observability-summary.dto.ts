import { ApiProperty } from "@nestjs/swagger";

export class MemoryUsageDto {
  @ApiProperty({ example: 52428800, description: "Heap memory used in bytes" })
  heapUsed: number;

  @ApiProperty({ example: 104857600, description: "Total heap size in bytes" })
  heapTotal: number;

  @ApiProperty({
    example: 157286400,
    description: "Resident set size in bytes",
  })
  rss: number;

  @ApiProperty({ example: 5242880, description: "External memory in bytes" })
  external: number;
}

export class RequestsByStatusDto {
  @ApiProperty({ example: 1400, description: "Successful responses (2xx)" })
  "2xx": number;

  @ApiProperty({ example: 80, description: "Client errors (4xx)" })
  "4xx": number;

  @ApiProperty({ example: 20, description: "Server errors (5xx)" })
  "5xx": number;

  @ApiProperty({ example: 0, description: "Other status codes" })
  other: number;
}

export class LatencyPercentilesDto {
  @ApiProperty({ example: 0.005, description: "50th percentile in seconds" })
  p50: number;

  @ApiProperty({ example: 0.025, description: "90th percentile in seconds" })
  p90: number;

  @ApiProperty({ example: 0.1, description: "95th percentile in seconds" })
  p95: number;

  @ApiProperty({ example: 0.5, description: "99th percentile in seconds" })
  p99: number;
}

export class ObservabilitySummaryDto {
  @ApiProperty({ example: 86400.5, description: "Process uptime in seconds" })
  uptime: number;

  @ApiProperty({ type: MemoryUsageDto })
  memory: MemoryUsageDto;

  @ApiProperty({ example: 1500, description: "Total HTTP requests" })
  totalRequests: number;

  @ApiProperty({ type: RequestsByStatusDto })
  requestsByStatus: RequestsByStatusDto;

  @ApiProperty({ type: LatencyPercentilesDto })
  latencyPercentiles: LatencyPercentilesDto;

  @ApiProperty({
    example: "http://localhost:3001",
    nullable: true,
    description: "Grafana dashboard URL if configured",
  })
  grafanaUrl: string | null;
}
