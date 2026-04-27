import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Payload to link an Elasticsearch index pattern to a catalog component.
 */
export class CreateComponentElasticsearchIndexDto {
  @ApiProperty({
    example: "logs-app-*",
    description: "Elasticsearch index name or pattern",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  indexPattern: string;

  @ApiPropertyOptional({
    example: "https://es.example.com:9200",
    description:
      "Optional Elasticsearch URL overriding the global ELASTICSEARCH_URL env var",
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  esUrl?: string;

  @ApiPropertyOptional({
    example: "Application JSON logs",
    description: "Free-form description of the linked index",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
