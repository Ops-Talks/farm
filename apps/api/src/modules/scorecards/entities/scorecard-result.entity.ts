import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";

/**
 * Maturity level awarded to a component after scorecard evaluation.
 * Levels are ordered: none < bronze < silver < gold < platinum.
 */
export enum ScorecardLevel {
  NONE = "none",
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

/**
 * Per-category numeric scores (0-100) that make up the overall scorecard result.
 * Each property maps to one of the five top-level scorecard categories.
 */
export interface ScorecardCategoryScores {
  /** Ownership and documentation category score (0-100). */
  ownershipDocs: number;
  /** Reliability category score (0-100). */
  reliability: number;
  /** Security category score (0-100). */
  security: number;
  /** Infrastructure category score (0-100). */
  infrastructure: number;
  /** Cost hygiene category score (0-100). */
  cost: number;
}

/**
 * Outcome of a single scorecard criterion for a given component evaluation.
 */
export interface ScorecardCriterionResult {
  /** Stable rule identifier (e.g. "has-owner"). */
  id: string;
  /** Human-readable rule name. */
  name: string;
  /** Parent category this criterion belongs to. */
  category: string;
  /** Whether the component satisfied the criterion. */
  passed: boolean;
  /** Relative importance weight used in score calculation. */
  weight: number;
  /** Explanation of what the criterion checks. */
  description: string;
  /**
   * When true the rule was skipped because it does not apply to this
   * component kind (e.g. a "has-dockerfile" rule skipped for a dataset).
   */
  notApplicable?: boolean;
}

/**
 * Stores the result of a single scorecard evaluation run for one component.
 * A new row is inserted (or the existing one upserted) each time the
 * ScorecardEvaluatorService runs against a component.
 */
@Entity("scorecard_results")
export class ScorecardResult {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Unique identifier of the scorecard result record",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440002",
    description: "UUID of the evaluated component",
  })
  @Column()
  @Index({ unique: true })
  componentId: string;

  /**
   * Owning component — loaded via JOIN when needed.
   * Cascade delete ensures scorecard rows are removed when a component is deleted.
   */
  @ManyToOne(() => Component, { onDelete: "CASCADE", nullable: false })
  @JoinColumn()
  component: Component;

  @ApiProperty({
    example: 82.5,
    description: "Weighted overall score in the 0-100 range",
  })
  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
  })
  overallScore: number;

  @ApiProperty({
    enum: ScorecardLevel,
    example: ScorecardLevel.SILVER,
    description: "Maturity level derived from the overall score",
  })
  @Column({
    type: "varchar",
    default: ScorecardLevel.NONE,
    enum: ScorecardLevel,
  })
  level: ScorecardLevel;

  @ApiPropertyOptional({
    description: "Breakdown of scores per scorecard category",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  categoryScores: ScorecardCategoryScores;

  @ApiPropertyOptional({
    description: "Individual criterion pass/fail results",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  criteria: ScorecardCriterionResult[];

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "UUID of the organization this result belongs to",
    nullable: true,
  })
  @Column({ nullable: true })
  organizationId: string;

  @ApiPropertyOptional({
    example: "2024-01-15T10:30:00Z",
    description: "Timestamp of when the evaluation was executed",
    nullable: true,
  })
  @Column({ type: "timestamp", nullable: true })
  evaluatedAt: Date;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Record creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-15T10:30:00Z",
    description: "Record last-updated timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
