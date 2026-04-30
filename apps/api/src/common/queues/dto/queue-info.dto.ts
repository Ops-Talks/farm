import { ApiProperty } from "@nestjs/swagger";

class JobCountsDto {
  @ApiProperty({ example: 0, description: "Number of active jobs" })
  active: number;

  @ApiProperty({ example: 15, description: "Number of completed jobs" })
  completed: number;

  @ApiProperty({ example: 2, description: "Number of failed jobs" })
  failed: number;

  @ApiProperty({ example: 0, description: "Number of delayed jobs" })
  delayed: number;

  @ApiProperty({ example: 0, description: "Number of waiting jobs" })
  waiting: number;

  @ApiProperty({ example: 0, description: "Number of paused jobs" })
  paused: number;

  @ApiProperty({ example: 0, description: "Number of prioritized jobs" })
  prioritized: number;
}

export class QueueInfoDto {
  @ApiProperty({ example: "catalog-discovery" })
  name: string;

  @ApiProperty({ example: false })
  isPaused: boolean;

  @ApiProperty({ type: JobCountsDto })
  jobCounts: JobCountsDto;
}

export class JobInfoDto {
  @ApiProperty({ example: "1" })
  id: string;

  @ApiProperty({ example: "catalog-discovery" })
  queueName: string;

  @ApiProperty({ example: "__default__" })
  name: string;

  @ApiProperty({
    example: "completed",
    enum: [
      "active",
      "completed",
      "failed",
      "delayed",
      "waiting",
      "paused",
      "unknown",
    ],
  })
  status: string;

  @ApiProperty({ example: { url: "https://github.com/org/repo" } })
  data: Record<string, unknown>;

  @ApiProperty({
    example: 3,
    required: false,
    description: "Return value of a completed job",
  })
  returnValue?: unknown;

  @ApiProperty({
    example: "Connection refused",
    required: false,
    description: "Error message for failed jobs",
  })
  failedReason?: string;

  @ApiProperty({ example: 1, description: "Number of attempts made" })
  attemptsMade: number;

  @ApiProperty({ example: 0, description: "Job progress (0-100 or object)" })
  progress: number | object;

  @ApiProperty({
    example: 1709913600000,
    description: "Unix timestamp when job was created",
  })
  timestamp: number;

  @ApiProperty({
    example: 1709913605000,
    required: false,
    description: "Unix timestamp when job started processing",
  })
  processedOn?: number;

  @ApiProperty({
    example: 1709913610000,
    required: false,
    description: "Unix timestamp when job finished",
  })
  finishedOn?: number;

  @ApiProperty({
    example: ["Error: Connection refused\n    at ..."],
    required: false,
    description: "Stack trace for failed jobs",
  })
  stacktrace?: string[];
}
