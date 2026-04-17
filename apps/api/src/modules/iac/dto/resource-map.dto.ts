import { ApiProperty } from "@nestjs/swagger";

export class ResourceNodeDto {
  @ApiProperty({ example: "aws_instance.web" })
  address: string;

  @ApiProperty({ example: "aws_instance" })
  resourceType: string;

  @ApiProperty({ example: "web" })
  resourceName: string;

  @ApiProperty({ example: "aws" })
  provider: string;
}

export class ResourceEdgeDto {
  @ApiProperty({ example: "aws_instance.web" })
  source: string;

  @ApiProperty({ example: "aws_security_group.web" })
  target: string;
}

/**
 * Response shape returned by the resource topology read endpoint.
 */
export class ResourceMapDto {
  @ApiProperty({ type: [ResourceNodeDto] })
  resources: ResourceNodeDto[];

  @ApiProperty({ type: [ResourceEdgeDto] })
  dependencies: ResourceEdgeDto[];
}
