import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Component } from "../../catalog/entities/component.entity";
import { ApiSpec } from "./api-spec.entity";
import { dateColumnType } from "../../../common/utils/column-type.util";

/**
 * Represents a consumer relationship between a catalog component (or team)
 * and an API specification. Tracks which components depend on which API specs.
 */
@Entity("api_consumers")
@Unique(["apiSpecId", "consumerComponentId"])
export class ApiConsumer {
  @ApiProperty({ description: "Unique identifier of the consumer record" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "ID of the consumed API spec" })
  @Column()
  apiSpecId: string;

  @ManyToOne(() => ApiSpec, { onDelete: "CASCADE" })
  @JoinColumn({ name: "apiSpecId" })
  apiSpec: ApiSpec;

  @ApiProperty({
    description: "ID of the consuming catalog component",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  consumerComponentId: string | null;

  @ManyToOne(() => Component, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "consumerComponentId" })
  consumerComponent: Component | null;

  @ApiProperty({
    description: "ID of the consuming team",
    nullable: true,
  })
  @Column({ type: "varchar", nullable: true })
  consumerTeamId: string | null;

  @ApiProperty({ description: "Timestamp when the consumer was registered" })
  @Column({ type: dateColumnType(), default: () => "CURRENT_TIMESTAMP" })
  addedAt: Date;
}
