import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { ApiSpec } from "../../api-specs/entities/api-spec.entity";
import { HealthStatus } from "../enums/health-status.enum";

/**
 * Stores the result of a health check performed against an API endpoint.
 */
@Entity("api_health_checks")
export class ApiHealthCheck {
  @ApiProperty({ description: "Unique identifier of the health check record" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "URL that was checked" })
  @Column()
  url: string;

  @ApiProperty({ enum: HealthStatus, description: "Health status result" })
  @Column({ type: "varchar", default: "up" })
  status: HealthStatus;

  @ApiProperty({
    description: "Measured round-trip latency in milliseconds",
    nullable: true,
  })
  @Column({ nullable: true, type: "int" })
  latencyMs: number | null;

  @ApiProperty({ description: "Associated API spec ID", nullable: true })
  @Column({ nullable: true })
  apiSpecId: string | null;

  @ManyToOne(() => ApiSpec, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "apiSpecId" })
  apiSpec: ApiSpec | null;

  @ApiProperty({ description: "Timestamp when the check was performed" })
  @Column({ type: "datetime" })
  checkedAt: Date;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;
}
