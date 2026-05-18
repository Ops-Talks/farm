import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { IacModule } from "./iac-module.entity";
import { dateColumnType } from "../../../common/utils/column-type.util";

/** Parsed variable declaration from variables.tf. */
export interface IacModuleVariable {
  name: string;
  type: string | null;
  description: string | null;
  default: string | null;
  required: boolean;
  validation: { condition: string; errorMessage: string } | null;
}

/** Parsed output declaration from outputs.tf. */
export interface IacModuleOutput {
  name: string;
  description: string | null;
  value: string | null;
}

/**
 * A versioned snapshot of an IacModule's HCL-parsed variable and output
 * declarations. One record per semver tag discovered during sync.
 */
@Entity("iac_module_versions")
@Index(["moduleId", "version"], { unique: true })
export class IacModuleVersion {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440011",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Parent IacModule identifier",
  })
  @Index()
  @Column()
  moduleId: string;

  @ManyToOne(() => IacModule, (m) => m.versions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "moduleId" })
  module: IacModule;

  @ApiProperty({
    example: "v5.1.2",
    description: "Semver version tag",
  })
  @Index()
  @Column()
  version: string;

  @ApiProperty({
    description: "Parsed variable declarations from variables.tf",
    type: "array",
    items: { type: "object" },
    nullable: true,
  })
  @Column({ type: "simple-json", nullable: true })
  variablesMeta: IacModuleVariable[] | null;

  @ApiProperty({
    description: "Parsed output declarations from outputs.tf",
    type: "array",
    items: { type: "object" },
    nullable: true,
  })
  @Column({ type: "simple-json", nullable: true })
  outputsMeta: IacModuleOutput[] | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Timestamp of the last successful HCL parse",
    nullable: true,
  })
  @Column({ type: dateColumnType(), nullable: true })
  syncedAt: Date | null;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440010",
    description: "Organization this module version belongs to",
    nullable: true,
  })
  @Index()
  @Column({ name: "organization_id", type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Returns variablesMeta as a typed array.
   * Handles raw JSON strings for cases where TypeORM has not yet deserialized
   * the column (e.g. manually constructed entities in tests).
   * Returns an empty array when the column is null or the string is invalid JSON.
   */
  getParsedVariables(): IacModuleVariable[] {
    if (this.variablesMeta === null || this.variablesMeta === undefined) {
      return [];
    }
    if (typeof (this.variablesMeta as unknown) === "string") {
      try {
        return JSON.parse(
          this.variablesMeta as unknown as string,
        ) as IacModuleVariable[];
      } catch {
        return [];
      }
    }
    return this.variablesMeta;
  }

  /**
   * Returns outputsMeta as a typed array.
   * Handles raw JSON strings for cases where TypeORM has not yet deserialized
   * the column (e.g. manually constructed entities in tests).
   * Returns an empty array when the column is null or the string is invalid JSON.
   */
  getParsedOutputs(): IacModuleOutput[] {
    if (this.outputsMeta === null || this.outputsMeta === undefined) {
      return [];
    }
    if (typeof (this.outputsMeta as unknown) === "string") {
      try {
        return JSON.parse(
          this.outputsMeta as unknown as string,
        ) as IacModuleOutput[];
      } catch {
        return [];
      }
    }
    return this.outputsMeta;
  }
}
