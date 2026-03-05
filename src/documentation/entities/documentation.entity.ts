import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a technical documentation entry in Farm.
 */
@Entity("documentation")
export class Documentation {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "API Getting Started Guide",
    description: "The title of the documentation",
  })
  @Column()
  title: string;

  @ApiProperty({
    example: "https://example.com/docs/getting-started.md",
    description: "The URL of the raw Markdown source file",
  })
  @Column({ type: "text" })
  sourceUrl: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "The ID of the associated component",
  })
  @Column()
  componentId: string;

  @ApiProperty({ example: "john_doe", description: "The author username" })
  @Column()
  author: string;

  @ApiProperty({ example: "1.0.0", description: "The documentation version" })
  @Column({ default: "1.0.0" })
  version: string;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The creation date",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The last update date",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
