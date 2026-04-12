import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpaResult } from "./entities/opa-result.entity";
import { OpaService } from "./opa.service";
import { OpaController } from "./opa.controller";

/**
 * Feature module for Open Policy Agent (OPA) integration.
 *
 * Provides:
 * - OpaService: HTTP facade for a standalone OPA server and result persistence.
 * - OpaController: REST endpoints under /api/v1/opa.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OpaResult])],
  controllers: [OpaController],
  providers: [OpaService],
  exports: [OpaService],
})
export class OpaModule {}
