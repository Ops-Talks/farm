import { ApiProperty } from "@nestjs/swagger";

/**
 * Result returned from a dry-run validation or live preview request.
 * Summarises whether the template variables are valid and provides a
 * rendered preview of what would be generated.
 */
export class DryRunResultDto {
  @ApiProperty({
    example: true,
    description: "Whether all required variables are valid and present",
  })
  valid: boolean;

  @ApiProperty({
    example: ["Missing required template variables: SERVICE_NAME"],
    description: "List of validation errors; empty when valid is true",
    type: [String],
  })
  errors: string[];

  @ApiProperty({
    example:
      "# my-service Preview\nVariables: {...}\nFiles to be created:\n- README.md",
    description: "Rendered preview string, truncated to 8192 characters",
  })
  preview: string;
}
