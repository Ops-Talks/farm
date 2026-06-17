import { IsString, IsOptional } from "class-validator";

export class PrometheusApiResponse {
  @IsString()
  status: string;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  error?: string;
}

export class ElasticsearchClusterHealth {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  cluster_name?: string;
}

export class OpenCostAllocationResponse {
  @IsOptional()
  data?: Record<string, unknown>;
}

export class OpaDataResponseDto {
  @IsOptional()
  result?: unknown;
}
