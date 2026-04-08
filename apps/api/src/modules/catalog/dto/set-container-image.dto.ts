import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * DTO for setting or updating container image metadata on a component.
 */
export class SetContainerImageDto {
  @ApiProperty({ example: 'ecr', description: 'Registry type (ecr, gcr, dockerhub, harbor)' })
  @IsString()
  @IsNotEmpty()
  registry: string;

  @ApiProperty({ example: '123456789.dkr.ecr.us-east-1.amazonaws.com/myapp', description: 'Image name/path' })
  @IsString()
  @IsNotEmpty()
  image: string;

  @ApiProperty({ example: '1.2.3', description: 'Latest tag', required: false })
  @IsString()
  @IsOptional()
  latestTag?: string;

  @ApiProperty({ example: 'sha256:abc123', description: 'Image digest', required: false })
  @IsString()
  @IsOptional()
  digest?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Image push date', required: false })
  @IsDateString()
  @IsOptional()
  pushedAt?: string;
}
