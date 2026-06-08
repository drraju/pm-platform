import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskTypeColumn1780848000000 implements MigrationInterface {
  name = 'AddTaskTypeColumn1780848000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN IF NOT EXISTS "type" character varying NOT NULL DEFAULT 'task'
    `);

    await queryRunner.query(`
      UPDATE "tasks"
      SET "type" = 'task'
      WHERE "type" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP COLUMN IF EXISTS "type"
    `);
  }
}
