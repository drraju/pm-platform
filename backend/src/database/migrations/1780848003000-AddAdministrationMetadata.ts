import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdministrationMetadata1780848003000 implements MigrationInterface {
  name = 'AddAdministrationMetadata1780848003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "category" character varying NOT NULL DEFAULT 'Administration'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "category"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "status"
    `);
  }
}
