import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * Data Transfer Object for registering a component via YAML content.
 */
export class RegisterComponentYamlDto {
  @ApiProperty({
    description: "The raw content of the catalog-info.yaml file",
    example: `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: user-service
  description: Handles user profiles
  tags: [java, microservice]
spec:
  type: service
  owner: platform-team
  lifecycle: production
    `,
  })
  @IsString()
  @IsNotEmpty()
  yaml: string;
}
