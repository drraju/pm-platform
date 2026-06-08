import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserUsernameForSuperAdmin1780848004000 implements MigrationInterface {
  name = 'AddUserUsernameForSuperAdmin1780848004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "username" character varying
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_username_unique"
      ON "users" ("username")
      WHERE "username" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_username_unique"');
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "username"
    `);
  }
}
