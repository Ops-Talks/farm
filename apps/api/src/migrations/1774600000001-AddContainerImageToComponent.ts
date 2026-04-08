import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: adds containerImage column to components table
 * to support container registry integration (Phase 17, FARM-S243).
 */
export class AddContainerImageToComponent1774600000001 implements MigrationInterface {
  name = 'AddContainerImageToComponent1774600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "components" ADD COLUMN "containerImage" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "components" DROP COLUMN "containerImage"`);
  }
}
