import { ApiProperty } from "@nestjs/swagger";

class ResourceNodeDto {
  @ApiProperty({
    example: "aws_instance.web",
    description: "Resource address in the IaC state",
  })
  address: string;

  @ApiProperty({ example: "aws_instance", description: "Resource type" })
  resourceType: string;

  @ApiProperty({ example: "web", description: "Resource name" })
  resourceName: string;

  @ApiProperty({ example: "aws", description: "IaC provider" })
  provider: string;
}

class ResourceEdgeDto {
  @ApiProperty({
    example: "aws_instance.web",
    description: "Source resource address",
  })
  source: string;

  @ApiProperty({
    example: "aws_security_group.web",
    description: "Target resource address",
  })
  target: string;
}

/**
 * Response shape returned by the resource topology read endpoint.
 */
export class ResourceMapDto {
  @ApiProperty({
    type: [ResourceNodeDto],
    description: "List of resource nodes in the topology",
  })
  resources: ResourceNodeDto[];

  @ApiProperty({
    type: [ResourceEdgeDto],
    description: "List of dependency edges in the topology",
  })
  dependencies: ResourceEdgeDto[];
}
